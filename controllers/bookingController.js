const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');

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

module.exports = { getTodayActivity };
