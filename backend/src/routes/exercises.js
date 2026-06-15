const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const exerciseRouter = express.Router();
exerciseRouter.use(authenticateToken);

// Get all exercises
exerciseRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM exercise_library WHERE deleted_at IS NULL ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

// Create exercise (Medical team only)
exerciseRouter.post("/", authorizeRole("medis"), async (req, res) => {
  try {
    const { name, type, focusArea, description, mappedMetric, frequency, intensity, timeDuration, typeFitt, sets, reps } = req.body;

    if (!name || !type || !focusArea) {
      return res
        .status(400)
        .json({ error: "Name, type, and focus area required" });
    }

    const result = await pool.query(
      `
      INSERT INTO exercise_library (name, type, focus_area, description, mapped_metric, frequency, intensity, time_duration, type_fitt, sets, reps)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `,
      [name, type, focusArea, description || null, mappedMetric || null, frequency || null, intensity || null, timeDuration || null, typeFitt || null, sets || null, reps || null]
    );

    res.status(201).json({
      message: "Exercise created",
      exerciseId: result.rows[0].id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create exercise" });
  }
});

// Delete exercise (Medical team only)
exerciseRouter.delete("/:id", authorizeRole("medis"), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "UPDATE exercise_library SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 RETURNING id",
      [req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    res.json({ message: "Exercise moved to Recycle Bin successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete exercise" });
  }
});

// Update exercise (Medical team only)
exerciseRouter.put("/:id", authorizeRole("medis"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, focusArea, description, mappedMetric, frequency, intensity, timeDuration, typeFitt, sets, reps } = req.body;

    if (!name || !type || !focusArea) {
      return res
        .status(400)
        .json({ error: "Name, type, and focus area required" });
    }

    const result = await pool.query(
      `
      UPDATE exercise_library 
      SET name = $1, type = $2, focus_area = $3, description = $4, mapped_metric = $5, frequency = $6, intensity = $7, time_duration = $8, type_fitt = $9, sets = $10, reps = $11
      WHERE id = $12
      RETURNING *
    `,
      [name, type, focusArea, description || null, mappedMetric || null, frequency || null, intensity || null, timeDuration || null, typeFitt || null, sets || null, reps || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Exercise not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update exercise" });
  }
});

// Get training programs for an athlete
exerciseRouter.get("/programs/athlete/:athleteId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        tp.*,
        el.name as exercise_name,
        el.type as exercise_type,
        el.focus_area
      FROM training_programs tp
      JOIN exercise_library el ON tp.exercise_id = el.id
      JOIN athletes a ON tp.athlete_id = a.id
      WHERE tp.athlete_id = $1 AND a.team_id = $2
    `,
      [req.params.athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch training programs" });
  }
});

// Get all training programs for a team
exerciseRouter.get("/programs", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        tp.*,
        el.name as exercise_name,
        el.type as exercise_type,
        el.focus_area,
        a.name as athlete_name,
        a.position as athlete_position
      FROM training_programs tp
      JOIN exercise_library el ON tp.exercise_id = el.id
      JOIN athletes a ON tp.athlete_id = a.id
      WHERE a.team_id = $1
      ORDER BY tp.id DESC
    `,
      [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch all training programs" });
  }
});

// Create training program (Medical and Coach teams)
exerciseRouter.post("/programs", async (req, res) => {
  // Manual check because authorizeRole typically takes one role
  if (req.user.role !== 'medis' && req.user.role !== 'pelatih') {
    return res.status(403).json({ error: "Access denied" });
  }
  try {
    const {
      athleteId,
      exerciseId,
      frequency,
      intensity,
      time,
      typeFitt,
      volume,
      progression,
      sets,
      reps,
    } = req.body;

    if (!athleteId || !exerciseId) {
      return res
        .status(400)
        .json({ error: "Athlete ID and Exercise ID required" });
    }

    const result = await pool.query(
      `
      INSERT INTO training_programs 
      (athlete_id, exercise_id, frequency, intensity, time, type_fitt, volume, progression, sets, reps)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
      [
        athleteId,
        exerciseId,
        frequency,
        intensity,
        time,
        typeFitt,
        volume,
        progression,
        sets,
        reps
      ]
    );

    res.status(201).json({
      message: "Training program created",
      programId: result.rows[0].id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create training program" });
  }
});

module.exports = {
  exerciseRouter,
};
