const express = require('express');
const {
  signUp,
  login,
  logout,
  protect,
  forgotPassword,
  resetPassword,
  sendTwoFactorCodeToCurrentlyLoginuser,
  activateTwoFactory,
  updatePassword,
} = require('../controllers/authController');
const {
  getRefreshToken,
  validateCSRFToken,
} = require('../controllers/securetyController');

const rout = '/api/v1/auth';
const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.get('/forgotPassword', forgotPassword);
router.post('/resetPassword/:token', resetPassword);
router.post('/refreshToken', getRefreshToken);
router.use(protect);
router.post('/logout', logout);
router.get('/sendTwoFactorAuth', sendTwoFactorCodeToCurrentlyLoginuser);
router.post('/2fa/:code', activateTwoFactory);
router.get('/2fa/updatePassword', sendTwoFactorCodeToCurrentlyLoginuser);
router.patch('/updatePassword/:code', validateCSRFToken, updatePassword);

module.exports = { router, rout };
