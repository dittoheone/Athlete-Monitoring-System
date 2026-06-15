const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { createAssessment } = require("../database/queries");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Predefined metric structure
const METRIC_STRUCTURE = {
  "Fisik & BIA": [
    "Kecepatan (Sprint 30m) (Detik)",
    "Kekuatan (1RM Squat) (Kg)",
    "Daya Tahan (VO2 Max) (mL/kg/min)",
    "Kelincahan (Illinois) (Detik)",
    "Keseimbangan (Y-Balance) (Cm)",
    "InBody Score (0-100)",
    "Body Fat % (Opsional)"
  ],
  "Mental & Tidur": [
    "Durasi Tidur (Jam)",
    "Kualitas Tidur (1-10)",
    "Motivasi (1-10)",
    "Fokus (1-10)",
    "Kepercayaan Diri (1-10)",
    "Tingkat Stres (1-10)"
  ],
  "ERP": [
    "RPE (Intensitas Latihan) (1-10)",
    "Nyeri Otot (Soreness) (1-10)"
  ]
};

// Get all assessments for an athlete
router.get("/athlete/:athleteId", async (req, res) => {
  try {
    const assessmentsResult = await pool.query(
      `
      SELECT a.*, u.name as assessor_name
      FROM assessments a
      JOIN users u ON a.user_id = u.id
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
    `,
      [req.params.athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );
    const assessments = assessmentsResult.rows;

    // Get metrics for each assessment
    const assessmentsWithMetrics = [];
    for (const assessment of assessments) {
      const metricsResult = await pool.query(
        `
        SELECT metric_category, metric_name, value
        FROM assessment_metrics
        WHERE assessment_id = $1
      `,
        [assessment.id]
      );

      assessmentsWithMetrics.push({ ...assessment, metrics: metricsResult.rows });
    }

    res.json(assessmentsWithMetrics);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch assessments" });
  }
});

// Get single assessment with metrics
router.get("/:id", async (req, res) => {
  try {
    const assessmentResult = await pool.query(
      `
      SELECT a.*, u.name as assessor_name, ath.name as athlete_name
      FROM assessments a
      JOIN users u ON a.user_id = u.id
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.id = $1 AND ath.team_id = $2
    `,
      [req.params.id, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    const assessment = assessmentResult.rows[0];

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_category, metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1
    `,
      [req.params.id]
    );

    res.json({ ...assessment, metrics: metricsResult.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch assessment" });
  }
});

// Create assessment (Medical team only)
router.post("/", authorizeRole("medis"), async (req, res) => {
  try {
    const { athleteId, date, weight, notes, metrics } = req.body;

    if (!athleteId || !date || !metrics) {
      return res
        .status(400)
        .json({ error: "Athlete ID, date, and metrics required" });
    }

    // Verify athlete belongs to user's team
    const athleteResult = await pool.query(
      "SELECT id FROM athletes WHERE id = $1 AND team_id = $2",
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );
    const athlete = athleteResult.rows[0];

    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Check if assessment already exists for this athlete on this date
    const existingAssessmentResult = await pool.query(
      "SELECT id FROM assessments WHERE athlete_id = $1 AND date = $2",
      [athleteId, date]
    );

    const existingId = existingAssessmentResult.rows[0]?.id;

    if (existingId) {
      // Append metrics to existing assessment
      for (const [category, categoryMetrics] of Object.entries(metrics)) {
        for (const [metricName, value] of Object.entries(categoryMetrics)) {
          // Upsert metric manually
          await pool.query(
            "DELETE FROM assessment_metrics WHERE assessment_id = $1 AND metric_category = $2 AND metric_name = $3",
            [existingId, category, metricName]
          );
          await pool.query(
            `
            INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value)
            VALUES ($1, $2, $3, $4)
            `,
            [existingId, category, metricName, value]
          );
        }
      }
      
      // Trigger recalculation of status
      const { calculateAthleteStatus } = require("../database/queries");
      const client = await pool.connect();
      try {
        const status = await calculateAthleteStatus(athleteId, client);
        await client.query("UPDATE athletes SET status = $1 WHERE id = $2", [status, athleteId]);
      } finally {
        client.release();
      }

      return res.status(200).json({
        message: "Assessment updated successfully",
        assessmentId: existingId,
      });
    }

    const assessmentId = await createAssessment(
      athleteId,
      req.user.id,
      date,
      weight,
      notes,
      metrics
    );

    res.status(201).json({
      message: "Assessment created successfully",
      assessmentId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});


// Get metric structure
router.get("/metrics/structure", (req, res) => {
  res.json(METRIC_STRUCTURE);
});

module.exports = router;
