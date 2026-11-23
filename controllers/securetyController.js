require('dotenv').config();
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const speakeasy = require('speakeasy');
const BlackListToken = require('../models/blackListTokenModel');
const RefreshToken = require('../models/refreshTokenModel');
const AppError = require('../utils/appError');
const Guest = require('../models/guestModel');
const { catchAsync } = require('../utils/catchAsync');
const TempLoginSession = require('../models/tempLoginSessionSchema');
const RehydrationSession = require('../models/rehydrationSession');
const {
  createToken,
  createRefreshToken,
  storeRefreshToken,
  deletingRefreshToken,
} = require('./tokensController');
const {
  generateCSRFToken,
  checkCSRFTokenwithoutExpiration,
} = require('./csrfTokenController');
const hashRefreshToken = require('../utils/hashRefreshToken');

async function createSendToken(user, statusCode, res, req, next) {
  const token = createToken(user._id);
  const refreshToken = createRefreshToken(user._id);
  await storeRefreshToken(refreshToken, user._id);
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
  const csrfToken = await generateCSRFToken(user);
  if (!csrfToken) {
    return next(new AppError('Failed to generate CSRF token', 500));
  }
  const { fingerprint } = req.body;
  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;
  user.csrfTokenExpires = undefined;
  user.devices = undefined;
  const timeSpan = Number(process.env.REHYDRATION_SESSION_LIFETIME) * 11;

  if (fingerprint) {
    await RehydrationSession.create({
      userId: user._id,
      fingerprint,
      lastIp:
        req.ip ||
        req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + timeSpan),
    });
  }
  await user.updateIsAuthenticated(true);
  if (req.authenticatedUser) {
    req.authenticatedUser = null;
    req.loginSuccess = false;
    res.status(statusCode).json({
      status: 'success',
      mfaFlag: true,
      csrfToken,
      refreshToken,
      data: {
        user,
      },
    });
    return;
  }
  res.status(statusCode).json({
    status: 'success',
    csrfToken,
    mfaFlag: false,
    refreshToken,
    data: {
      user,
    },
  });
}

const getRefreshToken = catchAsync(async (req, res, next) => {
  const refreshToken = req.body.refreshToken;
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
  await checkCSRFTokenwithoutExpiration(req, decoded.id).then((csrfError) => {
    if (csrfError) {
      return next(new AppError(csrfError, 403));
    }
  });
  const results = await Promise.allSettled([
    BlackListToken.find({ token: refreshToken }),
    RefreshToken.findOne({ token: refreshToken, user: decoded.id }),
  ]);
  const [blackList, refreshTokenDoc] = results;
  console.log(blackList.status, refreshTokenDoc.status);
  if (blackList.status === 'rejected') {
    return next(new AppError('Error checking blacklist token', 500));
  }
  if (refreshTokenDoc.status === 'rejected') {
    return next(new AppError('Error checking refresh token', 500));
  }
  if (blackList.value.length > 0) {
    console.log(refreshTokenDoc, blackList);
    return next(new AppError('Refresh token is blacklisted', 403));
  }
  if (
    !refreshTokenDoc.value.token ||
    refreshTokenDoc.value.expiresAt < Date.now()
  ) {
    await deletingRefreshToken(refreshToken, res, decoded);
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
  if (req.createRefreshToken) {
    req.createRefreshToken = null;
  }
  createSendToken(user, 200, res, req, next);
});

module.exports = {
  createSendToken,
  getRefreshToken,
};
