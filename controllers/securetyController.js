const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const BlackListToken = require('../models/blackListTokenModel');
const RefreshToken = require('../models/refreshTokenModel');
const AppError = require('../utils/appError');
const Guest = require('../models/guestModel');
const { catchAsync } = require('../utils/catchAsync');

function createToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function createRefreshToken(id) {
  return jwt.sign({ id }, process.env.JWT_SEKRET_REFRESH, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });
}
const generateCSRFToken = catchAsync(async (guest) => {
  const csrfToken = await guest.addCSRFToken();
  return csrfToken;
});
const generateCSRFTokenAfterExpiration = catchAsync(async (req, res, next) => {
  const guest = await Guest.findById(req.user._id).select(
    '+csrfToken +csrfTokenExpires',
  );
  if (guest.csrfTokenExpires < Date.now()) {
    await guest.addCSRFToken();
  }
  res.status(200).json({
    status: 'success',
    csrfToken: guest.csrfToken,
  });
});
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
async function createSendToken(user, statusCode, res) {
  const token = createToken(user._id);
  const refreshToken = createRefreshToken(user._id);
  const csrfToken = generateCSRFToken(user);
  storeRefreshToken(refreshToken, user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    sameSite: 'lax',
  };
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  user.csrfTokenExpires = undefined;
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

async function logoutByDeletingRefreshToken(token, res) {
  if (!token) {
    return new AppError('Token is missing', 400);
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    ignoreExpiration: true,
  });
  await BlackListToken.create({
    token,
    expiresAt: new Date(decoded.exp * 1000),
  });
  await RefreshToken.findOneAndDelete({ user: decoded.id });
}

const validateCSRFToken = catchAsync(async (req, res, next) => {
  const token = req.headers['x-csrf-token'] ?? '';
  if (!token) {
    return next(new AppError('CSRF token is missing', 403));
  }

  const guest = await Guest.findById(req.user._id).select(
    '+csrfToken +csrfTokenExpires',
  );
  if (guest.csrfTokenExpires < Date.now()) {
    return next(new AppError('CSRF token expired', 403));
  }
  if (!guest || !guest.correctCSRFToken(token)) {
    return next(new AppError('Invalid CSRF token', 403));
  }
  next();
});

const getRefreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError('Refresh token is missing', 400));
  }
  let decoded;
  try {
    // Verify the refresh token
    decoded = await promisify(jwt.verify)(
      refreshToken,
      process.env.JWT_SEKRET_REFRESH,
    );
  } catch (err) {
    return next(new AppError('Invalid refresh token', 403));
  }
  const results = await Promise.allSettled([
    BlackListToken.find({ token: refreshToken }),
    RefreshToken.findOne({ token: refreshToken, user: decoded.id }),
  ]);
  const [blackList, refreshTokenDoc] = results;
  if (blackList.status === 'rejected') {
    return next(new AppError('Error checking blacklist token', 500));
  }
  if (refreshTokenDoc.status === 'rejected') {
    return next(new AppError('Error checking refresh token', 500));
  }

  if (blackList.value.length > 0) {
    return next(new AppError('Refresh token is blacklisted', 403));
  }
  if (
    !refreshTokenDoc.value.token ||
    refreshTokenDoc.value.expiresAt < Date.now()
  ) {
    await logoutByDeletingRefreshToken(refreshToken, res);
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    return next(new AppError('Invalid or expired refresh token', 401));
  }
  await BlackListToken.create({
    token: refreshToken,
    expiresAt: new Date(decoded.exp * 1000),
  });
  await RefreshToken.findOneAndDelete({
    user: decoded.id,
    token: refreshToken,
  });
  const user = await Guest.findById(decoded.id);
  createSendToken(user, 200, res);
});

module.exports = {
  logoutByDeletingRefreshToken,
  createToken,
  createRefreshToken,
  createSendToken,
  getRefreshToken,
  validateCSRFToken,
  generateCSRFToken,
  generateCSRFTokenAfterExpiration,
};
