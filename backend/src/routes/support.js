const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");
const bcrypt = require("bcryptjs");

const router = express.Router();

// Public route to submit a support ticket
router.post("/", async (req, res) => {
  try {
    const { ticket_type, email, name, details } = req.body;

    if (!ticket_type || !email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!['password_reset', 'account_creation'].includes(ticket_type)) {
      return res.status(400).json({ error: "Invalid ticket type" });
    }

    const result = await pool.query(
      `INSERT INTO support_tickets (ticket_type, email, name, details)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [ticket_type, email, name, details || {}]
    );

    res.status(201).json({ message: "Ticket submitted successfully", ticketId: result.rows[0].id });
  } catch (error) {
    console.error("Failed to submit support ticket:", error);
    res.status(500).json({ error: "Failed to submit ticket" });
  }
});

// Admin routes below
router.use(authenticateToken);

// Get all support tickets
router.get("/", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const result = await pool.query(`
      SELECT * FROM support_tickets
      ORDER BY created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Failed to fetch tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// Resolve a ticket
router.put("/:id/resolve", async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const ticketId = req.params.id;
    const { action } = req.body; // e.g. "reset_password"

    const ticketResult = await pool.query("SELECT * FROM support_tickets WHERE id = $1", [ticketId]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const ticket = ticketResult.rows[0];

    let tempPassword = null;

    if (ticket.ticket_type === 'password_reset' && action === 'reset_password') {
      // Find the user by email
      const userResult = await pool.query("SELECT id FROM users WHERE email = $1", [ticket.email]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found with this email" });
      }

      const userId = userResult.rows[0].id;
      // Generate temp password
      tempPassword = "AMS-" + Math.random().toString(36).slice(-4).toUpperCase() + Math.floor(100 + Math.random() * 900);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await pool.query(
        "UPDATE users SET password = $1, requires_password_change = TRUE WHERE id = $2",
        [hashedPassword, userId]
      );
    }

    await pool.query(
      "UPDATE support_tickets SET status = 'resolved', resolved_at = NOW() WHERE id = $1",
      [ticketId]
    );

    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Memproses tiket dukungan (ID: ${ticketId})`, "Dukungan", "Berhasil", req.ip);
    }

    res.json({ message: "Ticket resolved successfully", tempPassword });
  } catch (error) {
    console.error("Failed to resolve ticket:", error);
    res.status(500).json({ error: "Failed to resolve ticket" });
  }
});

module.exports = router;
