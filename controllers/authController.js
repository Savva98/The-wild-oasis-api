const crypto = require('crypto');
const { promisify } = require('util');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const { catchAsync } = require('../utils/catchAsync');

const AppError = require('../utils/appError');

const Guest = require('../models/guestModel');
const BlacklistToken = require('../models/blackListTokenModel');

const Email = require('../utils/email');
const {
  logoutByDeletingRefreshToken,
  createSendToken,
} = require('./securetyController');

const twoFactorAuth = (req, res, next) => {
  const secret = speakeasy.generateSecret({}).base32;
  req.body.secret = secret;
  next();
};
const signUp = catchAsync(async (req, res, next) => {
  const user = await Guest.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.password,
    secret: req.body.secret,
  });
  user.secret = undefined;
  createSendToken(user, 201, res);
});
const login = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt) {
    return next(new AppError('You are already logged in', 400));
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  const guest = await Guest.findOne({ email }).select('+password +csrfToken');
  if (!guest || !(await guest.correctPassword(password, guest.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  createSendToken(guest, 200, res);
});
const logout = catchAsync(async (req, res, next) => {
  let token = req.cookies.jwt;
  if (
    !token &&
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }
  await logoutByDeletingRefreshToken(token, res);
  res.status(204).json({
    status: 'success',
  });
});

const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token || token === 'loggedout') {
    return next(new AppError('You are not logged in', 401));
  }
  const blackList = await BlacklistToken.findOne({ token });
  if (blackList) {
    await logoutByDeletingRefreshToken(token, res);
    return next(new AppError('Token is blacklisted', 403));
  }

  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET,
    (err) => {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired', 403));
      }
      return next(new AppError('Invalid token', 403));
    },
  );
  const currentGuest = await Guest.findById(decoded.id);
  if (!currentGuest) {
    return next(
      new AppError('The user belonging to this token no longer exist.', 401),
    );
  }
  if (currentGuest.changedPasswordAfter(decoded.iat)) {
    await logoutByDeletingRefreshToken(token, res);
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }
  req.user = currentGuest;
  next();
});

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

const forgotPassword = catchAsync(async (req, res, next) => {
  const guest = await Guest.findOne({ email: req.body.email });
  if (!guest) {
    return next(new AppError('There is no user with email address.', 404));
  }
  const resetToken = guest.createPasswordResetToken();
  await guest.save({ validateBeforeSave: false });
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/auth/resetPassword/${resetToken}`;
    await new Email(guest, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    guest.passwordResetToken = undefined;
    guest.passwordResetExpires = undefined;
    await guest.save({ validateBeforeSave: false });
    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500,
    );
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');
  const guest = await Guest.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!guest) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  if (req.body.password !== req.body.passwordConfirm) {
    return next(new AppError('Passwords are not the same!', 400));
  }
  if (guest.correctPassword(req.body.password, guest.password)) {
    return next(
      new AppError('New password can not be the same as the old one!', 400),
    );
  }
  guest.password = req.body.password;
  guest.passwordConfirm = req.body.passwordConfirm;
  guest.passwordChangedAt = Date.now() - 1000;
  guest.passwordResetToken = undefined;
  guest.passwordResetExpires = undefined;
  await guest.save();
  createSendToken(guest, 200, res);
});

const sendTwoFactorCodeToCurrentlyLoginuser = catchAsync(
  async (req, res, next) => {
    const { path } = req;
    const guest = await Guest.findById(req.user._id).select('+secret');
    if (!guest.secret) {
      const secret = speakeasy.generateSecret({}).base32;
      guest.addSecret(secret);
      await guest.save({ validateBeforeSave: false });
    }
    const code = speakeasy.totp({
      secret: guest.secret,
      encoding: 'base32',
    });
    let url = `${req.protocol}://${req.get('host')}/api/v1/auth/2fa/${code}`;
    if (path === '/api/v1/auth/2fa/updatePassword') {
      url = `${req.protocol}://${req.get('host')}/api/v1/auth/updatePassword/${code}
      `;
    }
    await new Email(guest, url, code).sendTwoFactor();
    res.status(200).json({
      status: 'success',
      message: 'Your Two Factory code was sent to the email!',
    });
  },
);

const activateTwoFactory = catchAsync(async (req, res, next) => {
  const { code } = req.params.code;
  if (!code) {
    return next(new AppError('Please provide two factor code', 400));
  }
  const guest = await Guest.findById(req.user._id).select('+secret');
  const isValid = speakeasy.totp.verify({
    secret: guest.secret,
    encoding: 'base32',
    token: code,
  });
  if (!isValid) {
    return next(new AppError('Invalid two factor code', 400));
  }
  await req.user.updateMfActive();
  res.status(200).json({
    status: 'success',
    message: 'Two factor authentication is enabled!',
  });
});

const updatePassword = catchAsync(async (req, res, next) => {
  const { code } = req.params;
  const { password, passwordConfirm, currentPassword } = req.body;
  if (!code) {
    return next(new AppError('Please provide two factor code', 400));
  }
  const guest = await Guest.findById(req.user._id).select('+password +secret');
  const isValid = speakeasy.totp.verify({
    secret: guest.secret,
    encoding: 'base32',
    token: code,
  });
  if (!isValid) {
    return next(new AppError('Invalid two-factor authentication code', 400));
  }
  if (!(await guest.correctPassword(currentPassword, guest.password))) {
    return next(new AppError('Your current password is wrong!', 401));
  }
  if (password === currentPassword) {
    return next(
      new AppError('New password can not be the same as the old one!', 400),
    );
  }
  let token = req.cookies.jwt;
  if (!token && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  }
  const decoded = jwt.decode(token, process.env.JWT_SECRET);
  await BlacklistToken.create({
    token,
    expiresAt: new Date(decoded.exp * 1000),
  });

  guest.password = password;
  guest.passwordConfirm = passwordConfirm;
  await guest.save();
  createSendToken(guest, 200, res);
});

module.exports = {
  twoFactorAuth,
  signUp,
  login,
  logout,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  sendTwoFactorCodeToCurrentlyLoginuser,
  activateTwoFactory,
  updatePassword,
};
