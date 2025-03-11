const mongose = require('mongoose');

const refreshTokenSchema = new mongose.Schema({
  token: {
    type: String,
    required: true,
  },
  user: {
    type: mongose.Schema.Types.ObjectId,
    ref: 'Guest',
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const RefreshToken = mongose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
