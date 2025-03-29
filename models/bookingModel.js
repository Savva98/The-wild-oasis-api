const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    created_at: {
      type: Date,
      default: Date.now(),
    },
    startDate: {
      type: Date,
      required: [true, 'Please provide the start date!'],
    },
    endDate: {
      type: Date,
      required: [true, 'Please provide the end date!'],
    },
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
      required: [true, 'Please provide the guest ID!'],
    },
    cabinId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cabin',
      required: [true, 'Please provide the cabin ID!'],
    },
    hasBreakfast: {
      type: Boolean,
      default: false,
    },
    observations: {
      type: String,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    numGuests: {
      type: Number,
      required: [true, 'Please provide the number of guests!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bookingSchema.pre(/^find/, function (next) {
  this.populate({ path: 'guestId', select: 'fullName email' }).populate({
    path: 'cabinId',
    select: 'name',
  });
  next();
});

bookingSchema.pre('save', function (next) {
  this.startDate = new Date(this.startDate);
  this.endDate = new Date(this.endDate);
  next();
});

bookingSchema.pre(/^findOneAnd/, async function (next) {
  this.populate('guestId').populate('cabinId');
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
