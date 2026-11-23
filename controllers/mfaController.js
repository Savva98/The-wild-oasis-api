const Guest = require('../models/guestModel');
const TempLoginSession = require('../models/tempLoginSessionSchema');
const AppError = require('../utils/appError');
const { catchAsyncWithArgs, catchAsync } = require('../utils/catchAsync');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const { createSendToken } = require('./securetyController');

const loginWithMFA = async (guest, res) => {
  const tempSessionId = crypto.randomBytes(32).toString('hex');
  await TempLoginSession.create({
    sessionId: tempSessionId,
    userId: guest._id,
    expireAt: new Date(Date.now() + 10 * 60 * 1000),
    verified: false,
    email: guest.email,
  });
  return res.status(200).json({
    status: 'success',
    requiresTotp: true,
    sessionId: tempSessionId,
    message: 'Please provide the code from your authenicator app.',
    expiresIn: '10 minutes',
    mfaFlag: true,
  });
};

const verifyMFADuringLogin = catchAsyncWithArgs(
  async (sessionId, totpToken, next) => {
    if (!sessionId || !totpToken) {
      return next(new AppError('Session ID and TOTP token are required', 400));
    }
    const session = await TempLoginSession.findOne({
      sessionId,
    });

    if (session.expireAt < Date.now()) {
      await TempLoginSession.deleteOne({ sessionId });
      return next(
        new AppError('Session has expired. Please login again.', 401),
      );
    }
    if (!session) {
      return next(new AppError('Invalid session. Please login again.', 401));
    }
    const guest = await Guest.findById(session.userId).select('+totpSecret');
    const totpValid = speakeasy.totp.verify({
      secret: guest.totpSecret,
      encoding: 'base32',
      token: totpToken,
      window: 2,
    });
    if (!totpValid) {
      return next(new AppError('Invalid two factor authentication code', 401));
    }
    await TempLoginSession.deleteOne({ sessionId });
  },
);
const protectLoginMFA = catchAsync(async (req, res, next) => {
  const { authenticatedUser } = req;
  if (!req.loginSuccess && !authenticatedUser) {
    return next(new AppError('MFA login session not found', 400));
  }
  next();
});
const loginWithActivatedMFA = catchAsync(async (req, res, next) => {
  const { sessionId, totpToken, email } = req.body;
  if (email != req.authenticatedUser.email) {
    return next(new AppError('Email does not match authenticated user', 400));
  }
  if (!sessionId || !totpToken) {
    return next(new AppError('Session ID and TOTP token are required', 400));
  }
  await verifyMFADuringLogin(sessionId, totpToken, next);
  createSendToken(authenticatedUser, 200, res, req);
  return;
});
const nextStepAfterLoginWithMFA = catchAsync(async (req, res, next) => {
  if (!sessionId || !totpToken) {
    return await loginWithMFA(authenticatedUser, res);
  }
});

module.exports = {
  loginWithMFA,
  verifyMFADuringLogin,
  protectLoginMFA,
  loginWithActivatedMFA,
  nextStepAfterLoginWithMFA,
};
