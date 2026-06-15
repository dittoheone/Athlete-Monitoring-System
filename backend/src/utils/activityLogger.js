const { pool } = require("../database/init");
const logger = require("./logger");

/**
 * Log an activity to the activity_logs table
 * @param {number|null} userId - The ID of the user performing the action
 * @param {string} action - The action description
 * @param {string} category - Category (e.g. Aktivitas, Sistem, Keamanan)
 * @param {string} status - Status (e.g. Berhasil, Gagal)
 * @param {string} ipAddress - The IP address
 */
const logActivity = async (userId, action, category, status, ipAddress) => {
  try {
    await pool.query(
      `
      INSERT INTO activity_logs (user_id, action, category, status, ip_address)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [userId, action, category, status, ipAddress]
    );
  } catch (error) {
    logger.error("Failed to log activity to database:", error);
  }
};

module.exports = {
  logActivity,
};
