const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { catchAsync } = require('../utils/catchAsync');
const QRcode = require('qrcode');

const AppError = require('../utils/appError');

const Guest = require('../models/guestModel');
const TempLoginSession = require('../models/tempLoginSessionSchema');
const BlacklistToken = require('../models/blackListTokenModel');

const Email = require('../utils/email');
const {
  logoutByDeletingRefreshToken,
  createSendToken,
  loginWithMFA,
  verifyMFADuringLogin,
} = require('./securetyController');

const signUp = catchAsync(async (req, res, next) => {
  const totpSecret = speakeasy.generateSecret({
    name: `Wild Oasis Login: ${req.email}`,
    issuer: 'Wild Oasis Hotel',
  });
  const user = await Guest.create({
    fullName: req.body.fullName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.password,
    totpSecret: totpSecret.base32,
  });
  user.totpSecret = undefined;
  createSendToken(user, 201, res);
});
const login = catchAsync(async (req, res, next) => {
  if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    return next(new AppError('You are already logged in', 400));
  }
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  const guest = await Guest.findOne({ email }).select(
    '+password +csrfToken +csrfTokenExpires',
  );
  if (!guest || !(await guest.correctPassword(password, guest.password))) {
    console.log(`Failed login attempt for email: ${email} from IP: ${req.ip}`);
    return next(new AppError('Incorrect email or password', 401));
  }
  if (guest.isMfActive) {
    req.authenticatedUser = guest;
    req.loginSuccess = true;
    return next();
  }
  createSendToken(guest, 200, res, req);
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
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
});
const protectLoginMFA = catchAsync(async (req, res, next) => {
  const { authenticatedUser } = req;
  if (!req.loginSuccess && !authenticatedUser) {
    return next(new AppError('MFA login session not found', 400));
  }
  next();
});
const loginWithActivatedMFA = catchAsync(async (req, res, next) => {
  const { sessionId, totpToken } = req.body;
  if (!sessionId || !totpToken) {
    return await loginWithMFA(authenticatedUser, res);
  }
  await verifyMFADuringLogin(sessionId, totpToken, next);
  createSendToken(authenticatedUser, 200, res, req);
  return;
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
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    return next(new AppError('Token is blacklisted', 403));
  }

  let decoded;
  try {
    // Verify the token
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(
        new AppError('Token expired. Please refresh your token.', 401),
      );
    }
    return next(new AppError('Invalid token', 403));
  }

  const currentGuest = await Guest.findById(decoded.id);
  if (!currentGuest) {
    return next(
      new AppError('The user belonging to this token no longer exist.', 401),
    );
  }
  if (currentGuest.changedPasswordAfter(decoded.iat)) {
    await logoutByDeletingRefreshToken(token, res);
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
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
    console.log(req.user);
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(new AppError('Please provide your email address', 400));
  }
  const guest = await Guest.findOne({ email: email });
  if (!guest) {
    return next(new AppError('There is no user with email address.', 404));
  }
  const resetToken = guest.createPasswordResetToken();
  await guest.save({ validateBeforeSave: false });
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/sanctum/resetPassword/${resetToken}`;
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
  const { password, passwordConfirm } = req.body;
  if (!password || !passwordConfirm) {
    return next(
      new AppError('Please provide password and passwordConfirm', 400),
    );
  }
  const guest = await Guest.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  }).select('+password');

  if (!guest) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  if (password !== passwordConfirm) {
    return next(new AppError('Passwords do not match!', 400));
  }
  const match = await guest.correctPassword(password, guest.password);
  if (match) {
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
  res.status(200).json({
    status: 'success',
    message: 'Password has been reset successfully!',
  });
});

const sendTwoFactorCodeToCurrentlyLoginuser = catchAsync(
  async (req, res, next) => {
    const { path } = req;
    const guest = await Guest.findById(req.user._id).select('+totpSecret');
    if (guest.isMfActive && path !== '/api/v1/sanctum/2fa/updatePassword') {
      return next(
        new AppError('Two factor authentication is already enabled', 400),
      );
    }
    let secret;
    if (!guest.totpSecret) {
      const secret = speakeasy.generateSecret({
        name: `Wild Oasis Login: ${req.user.email}`,
        issuer: 'Wild Oasis Hotel',
      }).base32;
      secret = await guest.addSecret(secret);
    }
    const qrCodeUrl = await QRcode.toDataURL(
      guest.totpSecret ? guest.totpSecret.otpauth_url : secret.otpauth_url,
    );
    const qrCodeTerminal = await QRcode.toString(
      guest.totpSecret ? guest.totpSecret.otpauth_url : secret.otpauth_url,
      {
        type: 'terminal',
      },
    );

    await new Email(guest).sendTwoFactorQrCode(
      qrCodeUrl,
      guest.totpSecret ? guest.totpSecret.base32 : secret.base32,
    );
    console.log(
      `QR Code for ${guest.email}:\n${qrCodeTerminal}\nManual Key: ${guest.totpSecret ? guest.totpSecret.base32 : secret.otpauth_url.base32}`,
    );
    res.status(200).json({
      status: 'success',
      message: 'Your Two Factory code was sent to the email!',
    });
  },
);

const twoFctortest = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  console.log(email);
  if (!email) {
    return next(new AppError('Please provide email', 400));
  }
  const secret = speakeasy.generateSecret({
    name: `Wild Oasis Hotel: ${email}`,
    issuer: 'Wild Oasis Hotel',
  });
  console.log(secret.base32);

  const qrCodeUrl = await QRcode.toDataURL(secret.otpauth_url);
  // const qrCodeTerminal = await QRcode.toString(secret.otpauth_url);
  console.log(qrCodeUrl);

  const guest = { email, fullName: 'Test User' };

  await new Email(guest).sendTwoFactorQrCode(qrCodeUrl, secret.base32);
  // console.log(
  //   `QR Code for ${email}:\n${qrCodeTerminal}\nManual Key: ${secret.otpauth_url.base32}`,
  // );
  res.status(200).json({
    status: 'success',
    message: 'Your Two Factory code was sent to the email!',
  });
});

const activateTwoFactory = catchAsync(async (req, res, next) => {
  const { totpCode } = req.body;
  if (!totpCode) {
    return next(new AppError('Please provide two factor code', 400));
  }
  const guest = await Guest.findById(req.user._id).select('+totpSecret');
  const isValid = speakeasy.totp.verify({
    secret: guest.totpSecret,
    encoding: 'base32',
    token: totpCode,
  });
  if (!isValid) {
    return next(new AppError('Invalid two factor code', 400));
  }
  await guest.updateMfActive();
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
  const guest = await Guest.findById(req.user._id).select(
    '+password +totpSecret',
  );
  const isValid = speakeasy.totp.verify({
    secret: guest.totpSecret,
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
  loginWithActivatedMFA,
  protectLoginMFA,
  twoFctortest,
};
