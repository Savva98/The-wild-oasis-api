const crypto = require('crypto');

const hashRefreshToken = (refreshToken) => {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
};

module.exports = hashRefreshToken;
