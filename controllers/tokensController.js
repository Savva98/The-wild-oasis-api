const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/refreshTokenModel');
const AppError = require('../utils/appError');
// const { catchAsync, catchAsyncWithArgs } = require('../utils/catchAsync');

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

async function storeRefreshToken(refreshToken, userId) {
  const expiresAt = new Date(
    Date.now() + 2 * process.env.JWT_REFRESH_EXPIRES_AT * 60 * 60 * 1000,
  );
  const storedRefreshTokens = await RefreshToken.find({ user: userId });
  if (!storedRefreshTokens) {
    await RefreshToken.create({
      token: refreshToken,
      user: userId,
      expiresAt: expiresAt,
    });
  } else {
    await RefreshToken.deleteOne({ user: userId });
    await RefreshToken.create({
      token: refreshToken,
      user: userId,
      expiresAt: expiresAt,
    });
  }
}
async function deletingRefreshToken(token, res, decoded, blacklist = true) {
  if (!token) {
    return new AppError('Token is missing', 400);
  }
  if (blacklist) {
    await BlackListToken.create({
      token,
      expiresAt: new Date(decoded.exp * 1000),
    });
  }

  await RefreshToken.findOneAndDelete({ user: decoded.id });
}

module.exports = {
  createToken,
  createRefreshToken,
  storeRefreshToken,
  deletingRefreshToken,
};
