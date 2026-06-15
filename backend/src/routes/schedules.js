const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get schedules for team
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM team_schedules WHERE team_id = $1 AND deleted_at IS NULL ORDER BY date ASC", [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

// Create schedule
router.post("/", authorizeRole("pelatih"), async (req, res) => {
  try {
    const { date, title, target, sessionType, timeRange } = req.body;
    if (!date || !title || !target || !sessionType || !timeRange) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await pool.query(`
      INSERT INTO team_schedules (team_id, date, title, target, session_type, time_range)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), date, title, target, sessionType, timeRange]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

// Delete schedule
router.delete("/:id", authorizeRole("pelatih"), async (req, res) => {
  try {
    await pool.query("UPDATE team_schedules SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND team_id = $3", [req.user.id, req.params.id, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    res.json({ message: "Schedule moved to Recycle Bin successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

module.exports = router;
