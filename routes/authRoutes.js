const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  signUp,
  login,
  logout,
  forgotPassword,
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

router.post('/signup', signUp);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/forgotPassword', forgotPassword);

module.exports = { router, rout };
