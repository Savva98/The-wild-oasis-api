const express = require('express');
const passkeyController = require('../FeaturesNotImplemented/Passkey');
const { protect, restrictTo } = require('../controllers/authController');

const router = express.Router();

const rout = '/api/v1/auth';
router.post('/begin-authentication', passkeyController.beginAuthentication);
router.post(
  '/complete-authentication',
  passkeyController.completeAuthentication,
);
router.use(protect);
router.post('/begin-registration', passkeyController.beginRegistration);
router.post('/complete-registration', passkeyController.completeRegistration);
router.delete('/:passkeyId', passkeyController.deletePasskey);
router.use(restrictTo('admin'));
router.get('/list-passkeys', passkeyController.listPasskeys);

module.exports = { router, rout };
