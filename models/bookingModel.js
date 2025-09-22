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
    numberOfNights: {
      type: Number,
      required: [true, 'Please provide the number of nights!'],
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
    totalPrice: {
      type: Number,
      required: [true, 'Please provide the total price!'],
      min: [0, 'Total price cannot be negative!'],
    },
    numGuests: {
      type: Number,
      required: [true, 'Please provide the number of guests!'],
    },
    status: {
      type: String,
      enum: [
        'unconfirmed',
        'confirmed',
        'checked-in',
        'checked-out',
        'canceled',
      ],
      default: 'unconfirmed',
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bookingSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guestId',
    select: 'fullName email nationality countryFlag',
  }).populate({
    path: 'cabinId',
    select: 'name regularPrice discount',
  });
  next();
});

bookingSchema.pre('save', function (next) {
  this.startDate = new Date(this.startDate);
  this.endDate = new Date(this.endDate);
  this.numberOfNights = Math.round(
    (this.endDate - this.startDate) / (1000 * 60 * 60 * 24),
  );
  this.totalPrice = this.cabinId.regularPrice;
  if (this.cabinId.discount > 0) {
    this.totalPrice -= this.cabinId.discount;
  }
  this.totalPrice *= this.numberOfNights;
  if (this.hasBreakfast) {
    this.totalPrice += this.numberOfNights * 20 * this.numGuests;
  }

  next();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
