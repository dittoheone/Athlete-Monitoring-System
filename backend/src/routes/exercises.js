const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const exerciseRouter = express.Router();
exerciseRouter.use(authenticateToken);

// Get all exercises
exerciseRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM exercise_library ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch exercises" });
  }
});

// Create exercise (Medical team only)
exerciseRouter.post("/", authorizeRole("medis"), async (req, res) => {
  try {
    const { name, type, focusArea, description } = req.body;

    if (!name || !type || !focusArea) {
      return res
        .status(400)
        .json({ error: "Name, type, and focus area required" });
    }

    const result = await pool.query(
      `
      INSERT INTO exercise_library (name, type, focus_area, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
      [name, type, focusArea, description || null]
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
      [req.params.athleteId, req.user.teamId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch training programs" });
  }
});

// Create training program (Medical team only)
exerciseRouter.post("/programs", authorizeRole("medis"), async (req, res) => {
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
