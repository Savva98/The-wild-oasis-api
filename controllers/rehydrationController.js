const BlackListToken = require('../models/blackListTokenModel');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const AppError = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const Guest = require('../models/guestModel');
const RehydrationSession = require('../models/rehydrationSession');
const { createToken, createRefreshToken } = require('./tokensController');
const {
  generateCSRFToken,
  validateCSRFToken,
} = require('./csrfTokenController');
const hashRefreshToken = require('../utils/hashRefreshToken');
const { createDeviceId } = require('../utils/deviceFingerprint');

const rehydrateLoginSession = catchAsync(async (req, res, next) => {
  let token = req.cookies.jwt;
  if (!token && req.headers.authorization?.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return next(new AppError('You are not logged in', 401));
  }

  const blackList = await BlackListToken.findOne({ token });
  if (blackList) {
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    await deletingRefreshToken(token, res, decoded, false);
    res.cookie('jwt', 'loggedout', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true,
    });
    return next(
      new AppError('Token is blacklisted. Please log in again.', 403),
    );
  }
  let decoded;
  try {
    decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError('Invalid token', 403));
  }
  const clientUA = req.headers['user-agent'];
  const deviceId = createDeviceId(clientUA);
  console.log(req.body);
  const { fingerprint } = req.body;
  if (!fingerprint) {
    return next(new AppError('Missing identity fingerprint', 400));
  }
  const session = await RehydrationSession.findOne({
    fingerprint,
    user: decoded.id,
    expiresAt: { $gt: Date.now() },
  });
  const lastRefreshedAt = session?.lastRefreshedAt;
  const timeSinceLastRefresh = Date.now() - (lastRefreshedAt?.getTime() ?? 0);
  if (timeSinceLastRefresh < 1000 * 60 * 1) {
    return next(new AppError('Too many rehydration attempts', 403));
  }
  const clientIp =
    req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  previouslyIp = session?.lastIp;
  if (previouslyIp && previouslyIp !== clientIp) {
    return next(
      new AppError('Client IP does not match rehydration session', 403),
    );
  }
  if (!session) {
    await RehydrationSession.findOneAndDelete({
      fingerprint,
      user: decoded.id,
    });
    return next(new AppError('Rehydration session not found or expired', 404));
  }
  if (session.userAgent !== clientUA) {
    return next(
      new AppError('Client user-agent does not match rehydration session', 403),
    );
  }
  const rehydrationCount = session?.rehydrationCount ?? 0;
  let sessionLifetime = Number(process.env.REHYDRATION_SESSION_LIFETIME) * 5;
  if (rehydrationCount > 5) {
    sessionLifetime = Number(process.env.REHYDRATION_SESSION_LIFETIME) * 2;
  }
  const guest = await Guest.findById(decoded.id).select(
    '+authenticated +csrfToken +csrfTokenExpires',
  );
  await validateCSRFToken(req, res, next, guest);
  if (!guest) {
    return next(
      new AppError('The user belonging to this token no longer exist.', 401),
    );
  }
  const deviceExists = guest.devices.find(
    (device) => device.deviceId === deviceId,
  );
  if (!deviceExists) {
    return next(new AppError('Unauthorized device', 403));
  }
  const newAccesstoken = createToken(guest._id);
  const newRefreshToken = createRefreshToken(guest._id);
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
  session.refreshTokenHash = hashRefreshToken(newRefreshToken);
  session.userAgent = clientUA;
  session.lastIp = clientIp;
  session.lastRefreshedAt = Date.now();
  session.expiresAt = new Date(Date.now() + sessionLifetime);
  session.rehydrationCount = rehydrationCount + 1;
  const savedSession = await session.save();
  if (!savedSession) {
    return next(new AppError('Failed to save rehydration session', 500));
  }
  res.cookie('jwt', newAccesstoken, cookieOptions);
  res.status(200).json({
    status: 'success',
    csrfToken,
    refreshToken: newRefreshToken,
    data: {
      user: guest,
    },
  });
});

module.exports = { rehydrateLoginSession };
