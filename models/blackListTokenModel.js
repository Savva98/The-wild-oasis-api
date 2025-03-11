const mongose = require('mongoose');

const blackListTokenSchema = new mongose.Schema({
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  expiresAt: {
    type: Date,
    required: true,
  },
});

const BlackListToken = mongose.model('BlackListToken', blackListTokenSchema);

module.exports = BlackListToken;
