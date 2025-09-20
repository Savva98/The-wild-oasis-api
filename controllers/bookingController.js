const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const { getAll, deleteOne } = require('./handleFactory');

const getTodayActivity = async (req, res, next) => {
  const today = new Date();
  const activity = await Booking.aggregate([
    {
      $match: {
        startDate: { $eq: today },
        $or: [
          { status: { $eq: 'unconfirmed' } },
          { status: { $eq: 'checked-in' } },
        ],
        endDate: { $eq: today },
      },
    },
    {
      $sort: { created_at: 1 },
    },
    {
      $limit: 10,
    },
    {
      $lookup: {
        from: 'guests',
        localField: 'guestId',
        foreignField: '_id',
        as: 'guestDetails',
      },
    },
    {
      $unwind: '$guestDetails',
    },
  ]);
  if (!activity) {
    return next(new AppError('No activity found for today', 404));
  }
  res.status(200).json({
    status: 'success',
    results: activity.length,
    activity,
  });
};

const getStaysAfterDate = async (req, res, next) => {
  // Accept date from query or params for flexibility
  const date = req.query.dateFrom || req.params.dateFrom;
  const today = new Date();
  if (!date) {
    return next(new AppError('Please provide a dateFrom parameter', 400));
  }

  const stays = await Booking.aggregate([
    {
      $match: {
        endDate: { $gt: new Date(date) },
        $or: [
          { status: 'checked-in' },
          { status: 'checked-out' },
          { status: 'confirmed' },
        ],
        created_at: { $lte: today },
      },
    },
    { $sort: { created_at: 1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: 'guests',
        localField: 'guestId',
        foreignField: '_id',
        as: 'guestDetails',
      },
    },
    { $unwind: '$guestDetails' },
  ]);

  if (!stays || stays.length === 0) {
    return next(new AppError('No stays found after the specified date', 404));
  }

  res.status(200).json({
    status: 'success',
    results: stays.length,
    stays,
  });
};

const checkIfBookingCabinIsPaid = (req, res, next) => {
  if (req.body.isPaid === true) {
    return next(
      new AppError(
        'You cannot set the booking as paid when creating or updating it. Please use the payment endpoint.',
        400,
      ),
    );
  }
};

const deleteBooking = deleteOne(Booking);

const getAllBookings = getAll(Booking);

module.exports = {
  getTodayActivity,
  getAllBookings,
  checkIfBookingCabinIsPaid,
  getStaysAfterDate,
  deleteBooking,
};
