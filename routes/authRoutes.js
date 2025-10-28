const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signUp,
  login,
  logout,
  forgotPassword,
  loginWithActivatedMFA,
  protectLoginMFA,
} = require('../controllers/authController');

const rout = '/api/v1/auth';
const router = express.Router();

const loginLimiter = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts from this IP, please try again later!',
  standardHeaders: true,
  legacyHeaders: false,
});
const forgetPasswordLimiter = rateLimit({
  max: 3,
  windowMs: 15 * 60 * 1000,
  message: 'Too many login attempts from this IP, please try again later!',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', signUp);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.post('/forgotPassword', forgetPasswordLimiter, forgotPassword);
router.use(protectLoginMFA);
router.post('/login-mfa', loginLimiter, loginWithActivatedMFA);

module.exports = { router, rout };
