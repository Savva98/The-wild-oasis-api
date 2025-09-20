const express = require('express');
const {
  getTodayActivity,
  getAllBookings,
  getStaysAfterDate,
} = require('../controllers/bookingController');

const { protect, restrictTo } = require('../controllers/authController');

const bookingRout = '/api/v1/bookings';
const router = express.Router();

router.get('/today-activity', protect, restrictTo('admin'), getTodayActivity);
router.get('/', getAllBookings);
router.get('/:dateFrom', getStaysAfterDate);

module.exports = { router, bookingRout };
