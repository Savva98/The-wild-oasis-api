const mongoose = require('mongoose');

const reviewsSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guest',
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cabin',
    },
    cretedAt: {
      type: Date,
      default: Date.now(),
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
reviewsSchema.index({ tourRef: 1, userRef: 1 }, { unique: true });

reviewsSchema.pre(/^find/, function (next) {
  this.populate({ path: 'user', select: 'name photo' });
  next();
});

const Review = mongoose.model('Review', reviewsSchema);

module.exports = Review;
