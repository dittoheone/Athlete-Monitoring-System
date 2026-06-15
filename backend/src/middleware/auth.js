const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../utils/config");
const logger = require("../utils/logger");
const { pool } = require("../database/init");

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'athlete-monitoring-system',
      audience: 'athlete-monitoring-users'
    });
    req.user = decoded;
    
    // Asynchronously update last_active timestamp
    if (decoded && decoded.id) {
      pool.query('UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = $1', [decoded.id])
        .catch(err => logger.error('Failed to update last_active:', err));
    }
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn('Token expired', { userId: err.expiredAt });
      return res.status(401).json({ error: "Token expired" });
    }
    if (err.name === 'JsonWebTokenError') {
      logger.warn('Invalid token', { error: err.message });
      return res.status(403).json({ error: "Invalid token" });
    }
    logger.error('Token verification error:', err);
    return res.status(403).json({ error: "Token verification failed" });
  }
}

// Middleware to check user role
function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by user ${req.user.email}, role: ${req.user.role}`);
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      });
    }

    next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRole,
  JWT_SECRET,
};
