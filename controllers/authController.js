const crypto = require('crypto');
const { promisify } = require('util');
const speakeasy = require('speakeasy');
const jwt = require('jsonwebtoken');
const cathAsync = require('../utils/catchAsync');
const RefreshToken = require('../models/refreshTokenModel');
const AppError = require('../utils/appError');
const Guest = require('../models/guestModel');
const BlacklistToken = require('../models/blackListTokenModel');
const Email = require('../utils/email');

async function logoutByDeletingRefreshToken(token, res) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  await BlacklistToken.create({
    token,
    expiresAt: new Date(decoded.exp * 1000),
  });
  await RefreshToken.findOneAndDelete({ user: decoded.id });
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
}

function createToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function createRefreshToken(id) {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
}

function createSendToken(user, statusCode, res) {
  const token = createToken(user._id);
  const refreshToken = createRefreshToken(user._id);
  storeRefreshToken(refreshToken, user._id);
  const csrfToken = user.addCSRFToken();
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  user.csrfToken = undefined;
  res.status(statusCode).json({
    status: 'success',
    token,
    refreshToken,
    csrfToken,
    data: {
      user,
    },
  });
}

async function storeRefreshToken(refreshToken, userId) {
  const expiresAt = new Date(
    Date.now() + 2 * process.env.JWT_REFRESH_EXPIRES_AT * 60 * 60 * 1000,
  );
  await RefreshToken.create({
    token: refreshToken,
    user: userId,
    expiresAt: expiresAt,
  });
}

const generateCSRFToken = cathAsync(async (req, res, next) => {
  const guest = await Guest.findById(req.user._id).select('+csrfToken');
  if (!guest) {
    return next(new AppError('Guest not found', 404));
  }
  const csrfToken = guest.addCSRFToken();
  res.status(200).json({
    status: 'success',
    csrfToken,
  });
});

const validateCSRFToken = cathAsync(async (req, res, next) => {
  const token = req.headers['csrf-token'] ?? '';
  if (!token) {
    return next(new AppError('CSRF token is missing', 403));
  }

  const guest = await Guest.findById(req.user._id).select('+csrfToken');
  if (!guest || !guest.correctCSRFToken(token)) {
    return next(new AppError('Invalid CSRF token', 403));
  }
  next();
});

const getRefreshToken = cathAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError('Refresh token is missing', 400));
  }
  const decoded = jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
    (err) => {
      if (err) {
        return next(new AppError('Invalid refresh token', 403));
      }
    },
  );
  const results = await Promise.allSettled([
    BlacklistToken.find({ token: refreshToken }),
    RefreshToken.findOne({ token: refreshToken, user: decoded.id }),
  ]);
  const [blackList, refreshTokenDoc] = results;
  if (blackList.status === 'rejected') {
    return next(new AppError('Error checking blacklist token', 500));
  }
  if (refreshTokenDoc.status === 'rejected') {
    return next(new AppError('Error checking refresh token', 500));
  }

  if (blackList.value) {
    return next(new AppError('Refresh token is blacklisted', 403));
  }
  if (!refreshTokenDoc.value || refreshTokenDoc.value.expiresAt < Date.now()) {
    await logoutByDeletingRefreshToken(refreshToken, res);
    return next(new AppError('Invalid or expired refresh token', 401));
  }
  await BlacklistToken.create({
    token: refreshToken,
    expiresAt: new Date(decoded.exp * 1000),
  });
  const user = await Guest.findById(decoded.id);
  createSendToken(user, 200, res);
});
const twoFactorAuth = (req, res, next) => {
  const secret = speakeasy.generateSecret({}).base32;
  req.body.secret = secret;
  next();
};
const signUp = cathAsync(async (req, res, next) => {
  const user = await Guest.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.password,
    role: req.body.role,
    secret: req.body.secret,
  });
  user.secret = undefined;
  createSendToken(user, 201, res);
});
const login = cathAsync(async (req, res, next) => {
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
const logout = cathAsync(async (req, res, next) => {
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

const protect = cathAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
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
      if (err) {
        return next(new AppError('Invalid token', 403));
      }
    },
  );
  const currentGuest = await Guest.findById(decoded.id);
  if (!currentGuest) {
    return next(
      new AppError('The user belonging to this token no longer exist.', 401),
    );
  }
  if (currentGuest.passwordChangedAt(decoded.iat)) {
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

const forgotPassword = cathAsync(async (req, res, next) => {
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

const resetPassword = cathAsync(async (req, res, next) => {
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

const sendTwoFactorCodeToCurrentlyLoginuser = cathAsync(
  async (req, res, next) => {
    const guest = await Guest.findById(req.user._id).select('+secret');
    if (guest.isMfActive) {
      return next(
        new AppError('Two factor authentication is already enabled!', 400),
      );
    }
    if (!guest.secret) {
      const secret = speakeasy.generateSecret({}).base32;
      guest.addSecret(secret);
      await guest.save({ validateBeforeSave: false });
    }
    const code = speakeasy.totp({
      secret: guest.secret,
      encoding: 'base32',
    });
    const url = `${req.protocol}://${req.get('host')}/api/v1/auth/2fa/${code}`;
    await new Email(guest, url, code).sendTwoFactor();
    res.status(200).json({
      status: 'success',
      message: 'Your Two Factory code was sent to the email!',
    });
  },
);

const activateTwoFactory = cathAsync(async (req, res, next) => {
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

const updatePassword = cathAsync(async (req, res, next) => {
  const { code, password, passwordConfirm, currentPassword } = req.body;
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
  createToken,
  createRefreshToken,
  storeRefreshToken,
  generateCSRFToken,
  validateCSRFToken,
  getRefreshToken,
  createSendToken,
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
