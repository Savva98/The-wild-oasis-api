const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signUp,
  login,
  logout,
  forgotPassword,
} = require('../controllers/authController');
const {
  loginWithActivatedMFA,
  protectLoginMFA,
  nextStepAfterLoginWithMFA,
} = require('../controllers/mfaController');
const {
  detectDevice,
  logoutDevice,
} = require('../controllers/deviceController');
const {
  rehydrateLoginSession,
} = require('../controllers/rehydrationController');

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

const rehydrateLimiter = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000,
  message:
    'Too many session rehydration attempts from this IP, please try again later!',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', detectDevice, signUp);
router.post(
  '/login',
  loginLimiter,
  detectDevice,
  login,
  nextStepAfterLoginWithMFA,
);
router.post('/logout', logoutDevice, logout);
router.post('/forgotPassword', forgetPasswordLimiter, forgotPassword);

router.post('/session', rehydrateLimiter, rehydrateLoginSession);
router.use(protectLoginMFA);
router.post('/login-mfa', loginLimiter, loginWithActivatedMFA);

module.exports = { router, rout };
