const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// Predefined metric structure
const METRIC_STRUCTURE = {
  Rehabilitasi: ["Cedera", "Pemulihan"],
  "Pemeriksaan Fisik": [
    "Fleksibilitas",
    "Kekuatan",
    "Daya Tahan",
    "Kecepatan",
    "Keseimbangan",
    "Kelincahan",
  ],
  "Kesehatan Mental": [
    "Stress",
    "Motivasi",
    "Percaya Diri",
    "Kohesi Tim",
    "Fokus",
  ],
  "Kualitas Tidur": ["Rata-rata Jam Tidur", "Kualitas", "Konsistensi"],
  Recovery: ["Tingkat Recovery"],
  "Tingkat Aktivitas": ["Harian", "Latihan", "Pertandingan", "Recovery"],
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
      [req.params.athleteId, req.user.teamId]
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
      [req.params.id, req.user.teamId]
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
      [athleteId, req.user.teamId]
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

    if (existingAssessmentResult.rows[0]) {
      return res.status(400).json({
        error: "Assessment already exists for this athlete on the selected date",
      });
    }

    const client = await pool.connect();
    let assessmentId;

    try {
      await client.query('BEGIN');

      const insertAssessmentResult = await client.query(
        `
        INSERT INTO assessments (athlete_id, user_id, date, weight_kg, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
        [athleteId, req.user.id, date, weight || null, notes || null]
      );
      assessmentId = insertAssessmentResult.rows[0].id;

      // Insert all metrics
      for (const [category, categoryMetrics] of Object.entries(metrics)) {
        for (const [metricName, value] of Object.entries(categoryMetrics)) {
          await client.query(
            `
            INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value)
            VALUES ($1, $2, $3, $4)
          `,
            [assessmentId, category, metricName, value]
          );
        }
      }

      // Calculate overall status based on metrics
      const status = calculateAthleteStatus(metrics);
      await client.query(
        `
        UPDATE athletes 
        SET last_assessment_date = $1, status = $2
        WHERE id = $3
      `,
        [date, status, athleteId]
      );

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    res.status(201).json({
      message: "Assessment created successfully",
      assessmentId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create assessment" });
  }
});

// Helper function to calculate athlete status
function calculateAthleteStatus(metrics) {
  const physical = metrics["Pemeriksaan Fisik"] || {};
  const mental = metrics["Kesehatan Mental"] || {};
  const rehab = metrics["Rehabilitasi"] || {};

  // Check if in rehabilitation
  if (rehab.Cedera && rehab.Cedera >= 7) {
    return "Rehabilitasi";
  }
  if (rehab.Pemulihan && rehab.Pemulihan < 5) {
    return "Pemulihan";
  }

  // Calculate average physical score
  const physicalValues = Object.values(physical);
  const mentalValues = Object.values(mental);

  const avgPhysical =
    physicalValues.length > 0
      ? physicalValues.reduce((a, b) => a + b, 0) / physicalValues.length
      : 5;
  const avgMental =
    mentalValues.length > 0
      ? mentalValues.reduce((a, b) => a + b, 0) / mentalValues.length
      : 5;

  // Determine status
  if (avgPhysical >= 8 && avgMental >= 8) return "Prima";
  if (avgPhysical >= 6 && avgMental >= 6) return "Fit";
  return "Pemulihan";
}

// Get metric structure
router.get("/metrics/structure", (req, res) => {
  res.json(METRIC_STRUCTURE);
});

module.exports = router;
