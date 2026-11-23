const Guest = require('../models/guestModel');
const AppError = require('../utils/appError');
const { catchAsync, catchAsyncWithArgs } = require('../utils/catchAsync');

const generateCSRFToken = catchAsyncWithArgs(async (guest) => {
  const csrfToken = await guest.addCSRFToken();
  return csrfToken;
});

const generateCSRFTokenAfterExpiration = catchAsync(async (req, res, next) => {
  const guest = await Guest.findById(req.user._id).select(
    '+csrfToken +csrfTokenExpires',
  );
  let csrfToken;
  const currentCsrfToken = req.headers['x-csrf-token'] ?? '';
  if (!currentCsrfToken) {
    return next(new AppError('CSRF token is missing', 403));
  }
  if (
    guest.correctCSRFToken(currentCsrfToken) &&
    guest.csrfTokenExpires > Date.now()
  ) {
    return next(new AppError('Current CSRF token is still valid', 400));
  }
  if (guest.csrfTokenExpires < Date.now()) {
    csrfToken = await guest.addCSRFToken();
  }
  res.status(200).json({
    status: 'success',
    csrfToken: csrfToken,
  });
});
const validateCSRFToken = catchAsync(async (req, res, next, user) => {
  const token = req.headers['x-csrf-token'] ?? '';
  if (!token) {
    return next(new AppError('CSRF token is missing', 403));
  }
  let guest;
  if (!user && req.user) {
    guest = await Guest.findById(req.user._id).select(
      '+csrfToken +csrfTokenExpires',
    );
  }
  if (user) {
    guest = user;
  }
  if (!guest) {
    return next(new AppError('User not found', 404));
  }
  if (guest.csrfTokenExpires < Date.now()) {
    return next(new AppError('CSRF token expired', 403));
  }
  if (!guest || !guest.correctCSRFToken(token)) {
    return next(new AppError('Invalid CSRF token', 403));
  }
  next();
});

const checkCSRFTokenwithoutExpiration = catchAsyncWithArgs(
  async (req, user) => {
    const token = req.headers['x-csrf-token'] ?? '';
    console.log(req);
    console.log(token);
    if (!token) {
      return 'CSRF token is missing';
    }
    if (!user.correctCSRFToken(token)) {
      return 'Invalid CSRF token';
    }
  },
);

module.exports = {
  validateCSRFToken,
  checkCSRFTokenwithoutExpiration,
  generateCSRFToken,
  generateCSRFTokenAfterExpiration,
};
