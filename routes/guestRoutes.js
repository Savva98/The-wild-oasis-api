const express = require('express');
const {
  getAllGuests,
  getMe,
  getGuest,
  deleteGuest,
  updateUserData,
} = require('../controllers/guestController');
const { protect, restrictTo } = require('../controllers/authController');
const { validateCSRFToken } = require('../controllers/securetyController');

const gestRout = '/api/v1/guests';

const router = express.Router();
router.use(protect);
router.use(restrictTo('admin'));
router.get('/', getAllGuests);
router.get('/me', getMe, getGuest);
router.delete('/deleteMe', validateCSRFToken, getMe, deleteGuest);
router.patch('/updateMe', validateCSRFToken, updateUserData);

module.exports = { router, gestRout };
