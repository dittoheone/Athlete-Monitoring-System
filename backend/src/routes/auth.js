const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../database/init");
const { JWT_SECRET } = require("../utils/config");
const { validateLogin, validateRegister } = require("../middleware/validators");
const logger = require("../utils/logger");
const { logActivity } = require("../utils/activityLogger");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Login
router.post("/login", validateLogin, async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();

    logger.info(`Login attempt for email: ${email}`);

    // Find user with team info
    const userResult = await pool.query(
      `
      SELECT u.*, 
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'
        ) as teams
      FROM users u 
      LEFT JOIN user_teams ut ON u.id = ut.user_id
      LEFT JOIN teams t ON ut.team_id = t.id 
      WHERE u.email = $1
      GROUP BY u.id
    `,
      [email]
    );
    const user = userResult.rows[0];

    if (!user) {
      logger.warn(`Login failed - user not found: ${email}`);
      await logActivity(null, `Gagal Login (User Not Found: ${email})`, "Keamanan", "Gagal", req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Login failed - invalid password for: ${email}`);
      await logActivity(user.id, "Gagal Login (Password Salah)", "Keamanan", "Gagal", req.ip);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is suspended
    if (user.is_active === false) {
      logger.warn(`Login failed - account suspended for: ${email}`);
      await logActivity(user.id, "Gagal Login (Akun Dinonaktifkan)", "Keamanan", "Gagal", req.ip);
      return res.status(403).json({ error: "Akun Anda telah dinonaktifkan. Silakan hubungi Administrator sistem." });
    }

    // Generate JWT token with secure configuration
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        teams: user.teams,
      },
      JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRATION || "24h",
        issuer: 'athlete-monitoring-system',
        audience: 'athlete-monitoring-users'
      }
    );

    logger.info(`Login successful for: ${email}`);
    await logActivity(user.id, "Login Berhasil", "Aktivitas", "Berhasil", req.ip);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teams: user.teams,
        requires_password_change: user.requires_password_change,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Register (optional - for creating new users)
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { name, email, password, role, teamId } = req.body;

    logger.info(`Registration attempt for email: ${email}`);

    // Check if email already exists
    const existingUserResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    const existingUser = existingUserResult.rows[0];

    if (existingUser) {
      logger.warn(`Registration failed - email already exists: ${email}`);
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password with configurable rounds
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password, role, team_id) 
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, email, hashedPassword, role, teamId]
    );

    const newUserId = result.rows[0].id;

    logger.info(`User registered successfully: ${email} (ID: ${newUserId})`);

    res.status(201).json({
      message: "User registered successfully",
      userId: newUserId,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Change Password Route (Forced for temp passwords)
router.post("/change-password", authenticateToken, async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);

    await pool.query(
      "UPDATE users SET password = $1, requires_password_change = FALSE WHERE id = $2",
      [hashedPassword, req.user.id]
    );

    if (req.user && req.user.id) {
      await logActivity(req.user.id, "Berhasil mengganti kata sandi wajib", "Keamanan", "Berhasil", req.ip);
    }

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

module.exports = router;
