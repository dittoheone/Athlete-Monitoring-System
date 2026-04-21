const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database/init");
const { JWT_SECRET } = require("../middleware/auth");
const { validateLogin, validateRegister } = require("../middleware/validators");
const logger = require("../utils/logger");

const router = express.Router();

// Login
router.post("/login", validateLogin, (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info(`Login attempt for email: ${email}`);

    // Find user with team info
    const user = db.prepare(`
      SELECT u.*, t.name as team_name 
      FROM users u 
      JOIN teams t ON u.team_id = t.id 
      WHERE u.email = ?
    `).get(email);

    if (!user) {
      logger.warn(`Login failed - user not found: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Verify password
    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Login failed - invalid password for: ${email}`);
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token with secure configuration
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        teamId: user.team_id,
      },
      JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRATION || "24h",
        issuer: 'athlete-monitoring-system',
        audience: 'athlete-monitoring-users'
      }
    );

    logger.info(`Login successful for: ${email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teamId: user.team_id,
        teamName: user.team_name,
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Register (optional - for creating new users)
router.post("/register", validateRegister, (req, res) => {
  try {
    const { name, email, password, role, teamId } = req.body;

    logger.info(`Registration attempt for email: ${email}`);

    // Check if email already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existingUser) {
      logger.warn(`Registration failed - email already exists: ${email}`);
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password with configurable rounds
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = bcrypt.hashSync(password, bcryptRounds);

    // Insert user
    const result = db
      .prepare(
        `INSERT INTO users (name, email, password, role, team_id) 
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(name, email, hashedPassword, role, teamId);

    logger.info(`User registered successfully: ${email} (ID: ${result.lastInsertRowid})`);

    res.status(201).json({
      message: "User registered successfully",
      userId: result.lastInsertRowid,
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: "Registration failed" });
  }
});

module.exports = router;
