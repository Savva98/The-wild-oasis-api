const mongoose = require('mongoose');

const cabinSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide the name of the cabin!'],
    },
    maxCapacity: {
      type: Number,
      required: [true, 'Please provide the maximum capacity of the cabin!'],
    },
    regularPrice: {
      type: Number,
      required: [true, 'Please provide the regular price of the cabin!'],
    },
    discount: {
      type: Number,
      required: [true, 'Please provide the discount of the cabin!'],
    },
    image: {
      type: String,
      required: [true, 'Please provide the image of the cabin!'],
    },
    images: {
      type: [String],
    },
    description: {
      type: String,
      required: [true, 'Please provide the description of the cabin!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
cabinSchema.index({ regularPrice: 1, discount: 1 });

const Cabin = mongoose.model('Cabin', cabinSchema);
module.exports = Cabin;
