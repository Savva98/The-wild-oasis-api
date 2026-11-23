const TempLoginSession = require('../models/tempLoginSessionSchema');
const logger = require('../logEvents');

const cleanupExpiredSessions = async () => {
  try {
    const result = await TempLoginSession.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    logger.info(
      `Cleanup: Deleted ${result.deletedCount} expired temporary login sessions.`,
    );
  } catch (error) {
    logger.error('Error during cleanup of expired sessions:', error);
  }
};

setInterval(cleanupExpiredSessions, 10 * 60 * 1000);
module.exports = cleanupExpiredSessions; // Run every hour
