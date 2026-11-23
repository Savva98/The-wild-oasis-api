const mongoose = require('mongoose');

const rehydrationSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  userAgent: { type: String, required: true },
  lastIp: { type: String, required: true },
  fingerprint: { type: String, required: true, index: true },
  refreshTokenHash: { type: String, required: true },
  lastRefreshedAt: { type: Date, default: Date.now },
  rehydrationAttempts: { type: Number, default: 0 },
  rehydrationCount: { type: Number, default: 0 },
});
rehydrationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RehydrationSession', rehydrationSessionSchema);
