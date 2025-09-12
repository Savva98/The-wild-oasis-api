const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  minimumNights: {
    type: Number,
    required: true,
  },
  maximumNights: {
    type: Number,
    required: true,
  },
  cleaningFee: {
    type: Number,
    required: true,
  },
  maximumGuests: {
    type: Number,
    required: true,
  },
  breakfastPrice: {
    type: Number,
    required: true,
  },
});

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
