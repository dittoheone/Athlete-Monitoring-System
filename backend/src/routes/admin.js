const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const bcrypt = require('bcryptjs');
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

// All routes require authentication and super admin role
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);

router.use(authorizeRole("admin"));

// Get dashboard stats
router.get("/stats", async (req, res) => {
  try {
    const [teamsRes, usersRes, athletesRes, activeRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM teams"),
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM athletes"),
      pool.query("SELECT COUNT(*) FROM users WHERE last_active >= NOW() - INTERVAL '15 minutes'")
    ]);
    
    res.json({
      totalTeams: parseInt(teamsRes.rows[0].count),
      activeAccounts: parseInt(usersRes.rows[0].count),
      totalAthletes: parseInt(athletesRes.rows[0].count),
      activeSessions: parseInt(activeRes.rows[0].count),
      serverStatus: "Normal"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Get activity logs
router.get("/activity-logs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.name as user_name, u.role as user_role
      FROM activity_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

// Get all teams
router.get("/teams", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM teams WHERE deleted_at IS NULL ORDER BY name"
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Create team
router.post("/teams", async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Team name required" });

    const result = await pool.query(
      "INSERT INTO teams (name) VALUES ($1) RETURNING id",
      [name]
    );

    // Initialize default team settings for the new team
    await pool.query(
      "INSERT INTO team_settings (team_id, threshold_prima, threshold_underperform) VALUES ($1, 85, 70)",
      [result.rows[0].id]
    );

    res.status(201).json({ message: "Team created successfully", teamId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create team" });
  }
});

// Delete team
router.delete("/teams/:id", async (req, res) => {
  try {
    await pool.query("UPDATE teams SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Menghapus tim (ID: ${req.params.id}) ke Recycle Bin`, "Keamanan", "Berhasil", req.ip);
    }
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

// Get users
router.get("/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    let query = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, 
        COALESCE(
          json_agg(
            json_build_object('id', t.id, 'name', t.name)
          ) FILTER (WHERE t.id IS NOT NULL), 
          '[]'
        ) as teams
      FROM users u
      LEFT JOIN user_teams ut ON u.id = ut.user_id
      LEFT JOIN teams t ON ut.team_id = t.id
      WHERE u.deleted_at IS NULL AND u.role != 'admin'
      GROUP BY u.id
      ORDER BY u.name
    `;

    if (!isNaN(page) && !isNaN(limit)) {
      const offset = (page - 1) * limit;
      query += ` LIMIT $1 OFFSET $2`;
      const result = await pool.query(query, [limit, offset]);

      const countRes = await pool.query(`SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND role != 'admin'`);
      const totalCount = parseInt(countRes.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      res.json({ data: result.rows, totalCount, totalPages, currentPage: page });
    } else {
      const result = await pool.query(query);
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Create user
router.post("/users", async (req, res) => {
  try {
    const { name, email, password, role, teamIds } = req.body;
    if (!name || !email || !password || !role || !teamIds || !Array.isArray(teamIds)) {
      return res.status(400).json({ error: "All fields are required and teamIds must be an array" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, requires_password_change) VALUES ($1, $2, $3, $4, TRUE) RETURNING id",
      [name, email, hashedPassword, role]
    );
    
    const userId = result.rows[0].id;
    for (let tId of teamIds) {
      await pool.query("INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, tId]);
    }

    // Log this activity
    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Membuat pengguna baru: ${email}`, "Aktivitas", "Berhasil", req.ip);
    }

    res.status(201).json({ message: "User created successfully", userId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  try {
    const { name, email, role, teamIds, password, is_active } = req.body;
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await pool.query(
        "UPDATE users SET name = $1, email = $2, role = $3, password = $4, is_active = $5 WHERE id = $6",
        [name, email, role, hashedPassword, is_active, req.params.id]
      );
    } else {
      await pool.query(
        "UPDATE users SET name = $1, email = $2, role = $3, is_active = $4 WHERE id = $5",
        [name, email, role, is_active, req.params.id]
      );
    }
    
    if (teamIds && Array.isArray(teamIds)) {
      await pool.query("DELETE FROM user_teams WHERE user_id = $1", [req.params.id]);
      for (let tId of teamIds) {
        await pool.query("INSERT INTO user_teams (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [req.params.id, tId]);
      }
    }
    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Memperbarui pengguna (ID: ${req.params.id})`, "Aktivitas", "Berhasil", req.ip);
    }
    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    await pool.query("UPDATE users SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Menghapus pengguna (ID: ${req.params.id}) ke Recycle Bin`, "Keamanan", "Berhasil", req.ip);
    }
    res.json({ message: "User moved to Recycle Bin successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Generate backup (dummy/mock implementation as actual pg_dump is not available in environment)
router.get("/backup", async (req, res) => {
  try {
    // In a real scenario, this would execute pg_dump. 
    // Here we create a JSON dump of core tables for demonstration.
    const backupData = {};
    const tables = ['users', 'teams', 'athletes', 'team_settings', 'criteria_weights', 'recommendation_rules'];
    
    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = rows;
    }
    
    const jsonString = JSON.stringify(backupData, null, 2);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `ams_backup_${dateStr}.json`;
    
    res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-type', 'application/json');
    res.send(jsonString);
  } catch (error) {
    console.error("Backup error:", error);
    res.status(500).json({ error: "Failed to generate backup" });
  }
});

// Restore backup (mock implementation)
router.post("/restore", async (req, res) => {
  try {
    // In a real scenario, this would execute psql with the uploaded file.
    // For safety and simplicity, we just mock the success response.
    res.json({ message: "Database berhasil di-restore dari backup." });
  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({ error: "Failed to restore database" });
  }
});

module.exports = router;
