const expres = require('express');
const {
  getRefreshToken,
  validateCSRFToken,
  generateCSRFTokenAfterExpiration,
} = require('../controllers/securetyController');
const {
  protect,
  sendTwoFactorCodeToCurrentlyLoginuser,
  activateTwoFactory,
  updatePassword,
  resetPassword,
} = require('../controllers/authController');

const rout = '/api/v1/sanctum';
const router = expres.Router();
router.post('/refreshToken', getRefreshToken);
router.post('/resetPassword/:token', resetPassword);
router.use(protect);
router.post('/getnewCsrfToken', generateCSRFTokenAfterExpiration);
router.get('/sendTwoFactorAuth', sendTwoFactorCodeToCurrentlyLoginuser);
router.post('/2fa/:code', activateTwoFactory);
router.get('/2fa/updatePassword', sendTwoFactorCodeToCurrentlyLoginuser);
router.patch('/updatePassword/:code', validateCSRFToken, updatePassword);

module.exports = { router, rout };
