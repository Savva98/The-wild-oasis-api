const mongoose = require('mongoose');
const tempLoginSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  expireAt: {
    type: Date,
    default: Date.now,
    index: { expires: '15m' },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const TempLoginSession = mongoose.model(
  'TempLoginSession',
  tempLoginSessionSchema,
);
module.exports = TempLoginSession;
