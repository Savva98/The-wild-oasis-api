const express = require('express');
const {
  getTodayActivity,
  getAllBookings,
  getStaysAfterDate,
  getBookingById,
  updateBoking,
  deleteBooking,
} = require('../controllers/bookingController');

const { protect, restrictTo } = require('../controllers/authController');

const bookingRout = '/api/v1/bookings';
const router = express.Router();
router.use(protect);
router.route('/:id').get(getBookingById);
router.route('/checkin/:id').get(getBookingById);
router.get('/', getAllBookings);
router.get('/:dateFrom', getStaysAfterDate);
router.route('/checkin/:id').patch(restrictTo('admin'), updateBoking);
router
  .route('/checkout/:id')
  .get(getBookingById)
  .patch(restrictTo('admin'), updateBoking);
router.get('/today-activity', restrictTo('admin'), getTodayActivity);
router.route('/delete/:id').delete(restrictTo('admin'), deleteBooking);

module.exports = { router, bookingRout };
