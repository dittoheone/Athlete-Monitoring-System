const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all athletes for user's team
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT * FROM athletes 
      WHERE team_id = $1 
      ORDER BY name
    `,
      [req.user.teamId]
    );

    res.json(result.rows);
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
      WHERE a.id = $1 AND a.team_id = $2
    `,
      [req.params.id, req.user.teamId]
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
      [req.user.teamId, name, position]
    );

    res.status(201).json({
      message: "Athlete created",
      athleteId: result.rows[0].id,
    });
  } catch (error) {
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
      "SELECT id FROM athletes WHERE id = $1 AND team_id = $2",
      [athleteId, req.user.teamId]
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
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Delete all assessment_metrics for this athlete's assessments
      await client.query(
        `
        DELETE FROM assessment_metrics 
        WHERE assessment_id IN (SELECT id FROM assessments WHERE athlete_id = $1)
      `,
        [athleteId]
      );

      // 2. Delete all assessments for this athlete
      await client.query("DELETE FROM assessments WHERE athlete_id = $1", [athleteId]);

      // 3. Delete all training programs for this athlete
      await client.query("DELETE FROM training_programs WHERE athlete_id = $1", [athleteId]);

      // 4. Finally, delete the athlete
      const result = await client.query(
        "DELETE FROM athletes WHERE id = $1 AND team_id = $2",
        [athleteId, req.user.teamId]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: "Athlete not found" });
      }

      await client.query('COMMIT');
      res.json({ message: "Athlete deleted successfully" });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete athlete" });
  }
});

module.exports = router;
