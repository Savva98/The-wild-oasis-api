const express = require('express');
const {
  getAllGuests,
  getMe,
  getGuest,
  deleteGuest,
  updateUserData,
  uploadUserPhoto,
  resizeUserPhoto,
  checkUploadedData,
} = require('../controllers/guestController');
const { protect, restrictTo } = require('../controllers/authController');
const { validateCSRFToken } = require('../controllers/securetyController');

const gestRout = '/api/v1/guests';

const router = express.Router();
router.use(protect, validateCSRFToken);
router.get('/me', getMe, getGuest);
router.delete('/deleteMe', getMe, deleteGuest);
router.patch(
  '/updateMe',
  uploadUserPhoto,
  resizeUserPhoto,
  checkUploadedData,
  updateUserData,
);
router.use(restrictTo('admin'));
router.get('/', getAllGuests);
router.route('/:id').get(getGuest).delete(deleteGuest);

module.exports = { router, gestRout };
