const TempLoginSession = require('../models/tempLoginSessionSchema');

const cleanupExpiredSessions = async () => {
  try {
    const result = await TempLoginSession.deleteMany({
      expiresAt: { $lt: new Date() },
    });
    console.log(
      `Cleanup: Deleted ${result.deletedCount} expired temporary login sessions.`,
    );
  } catch (error) {
    console.error('Error during cleanup of expired sessions:', error);
  }
};

setInterval(cleanupExpiredSessions, 10 * 60 * 1000);
module.exports = cleanupExpiredSessions; // Run every hour
