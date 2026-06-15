const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get all athletes for user's team
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const teamId = req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);
    
    let query = `
      SELECT * FROM athletes 
      WHERE team_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `;
    let params = [teamId];

    if (!isNaN(page) && !isNaN(limit)) {
      const offset = (page - 1) * limit;
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);
      
      const countRes = await pool.query(
        `SELECT COUNT(*) FROM athletes WHERE team_id = $1 AND deleted_at IS NULL`,
        [teamId]
      );
      const totalCount = parseInt(countRes.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);
      
      const result = await pool.query(query, params);
      return res.json({ data: result.rows, totalCount, totalPages, currentPage: page });
    } else {
      const result = await pool.query(query, params);
      return res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch athletes" });
  }
});

// Get single athlete with details
router.get("/:id", async (req, res) => {
  try {
    const athleteResult = await pool.query(
      `
      SELECT a.*, t.name as team_name
      FROM athletes a
      JOIN teams t ON a.team_id = t.id
      WHERE a.id = $1 AND a.team_id = $2 AND a.deleted_at IS NULL
    `,
      [req.params.id, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    const athlete = athleteResult.rows[0];

    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Get latest assessment
    const latestAssessmentResult = await pool.query(
      `
      SELECT * FROM assessments 
      WHERE athlete_id = $1 
      ORDER BY date DESC 
      LIMIT 1
    `,
      [req.params.id]
    );

    const latestAssessment = latestAssessmentResult.rows[0];

    res.json({ ...athlete, latestAssessment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch athlete" });
  }
});

// Create athlete (Coach only)
router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "pelatih") {
      return res
        .status(403)
        .json({ error: "Only coaches can create athletes" });
    }

    const { name, position } = req.body;

    if (!name || !position) {
      return res.status(400).json({ error: "Name and position required" });
    }

    const validPositions = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
    if (!validPositions.includes(position)) {
      return res.status(400).json({ error: "Invalid position" });
    }

    const result = await pool.query(
      `
      INSERT INTO athletes (team_id, name, position, status) 
      VALUES ($1, $2, $3, 'Fit')
      RETURNING id
    `,
      [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), name, position]
    );

    res.status(201).json({
      message: "Athlete created",
      athleteId: result.rows[0].id,
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: "Atlet dengan nama ini sudah ada di tim." });
    }
    console.error(error);
    res.status(500).json({ error: "Failed to create athlete" });
  }
});

// Update athlete
router.put("/:id", async (req, res) => {
  try {
    const { name, position, status } = req.body;
    const athleteId = req.params.id;

    // Verify athlete belongs to user's team
    const athleteResult = await pool.query(
      "SELECT id FROM athletes WHERE id = $1 AND team_id = $2 AND deleted_at IS NULL",
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    const athlete = athleteResult.rows[0];

    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const updates = [];
    const values = [];

    if (name) {
      updates.push(`name = $${updates.length + 1}`);
      values.push(name);
    }
    if (position) {
      updates.push(`position = $${updates.length + 1}`);
      values.push(position);
    }
    if (status) {
      updates.push(`status = $${updates.length + 1}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(athleteId);

    await pool.query(
      `UPDATE athletes SET ${updates.join(", ")} WHERE id = $${values.length}`,
      values
    );

    res.json({ message: "Athlete updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update athlete" });
  }
});

// Delete athlete
router.delete("/:id", async (req, res) => {
  try {
    if (req.user.role !== "pelatih") {
      return res
        .status(403)
        .json({ error: "Only coaches can delete athletes" });
    }

    const athleteId = req.params.id;
    
    const result = await pool.query(
      "UPDATE athletes SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND team_id = $3 RETURNING id",
      [req.user.id, athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Menghapus atlet (ID: ${athleteId}) ke Recycle Bin`, "Keamanan", "Berhasil", req.ip);
    }
    res.json({ message: "Athlete moved to Recycle Bin successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete athlete" });
  }
});

module.exports = router;
