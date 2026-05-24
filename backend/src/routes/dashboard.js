const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

// Get athlete performance tracking data
router.get("/athlete/:athleteId/performance", async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { category, metric } = req.query;

    // Verify athlete belongs to user's team
    const athleteResult = await pool.query(
      "SELECT id FROM athletes WHERE id = $1 AND team_id = $2",
      [athleteId, req.user.teamId]
    );
    const athlete = athleteResult.rows[0];

    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    let query = `
      SELECT 
        a.date,
        am.metric_category,
        am.metric_name,
        am.value
      FROM assessments a
      JOIN assessment_metrics am ON a.id = am.assessment_id
      WHERE a.athlete_id = $1
    `;
    const params = [athleteId];
    let paramCount = 2;

    if (category) {
      query += ` AND am.metric_category = $${paramCount++}`;
      params.push(category);
    }

    if (metric) {
      query += ` AND am.metric_name = $${paramCount++}`;
      params.push(metric);
    }

    query += " ORDER BY a.date ASC";

    const dataResult = await pool.query(query, params);
    const data = dataResult.rows;

    // Calculate percentage changes
    const processedData = [];
    const groupedByMetric = {};

    data.forEach((row) => {
      const key = `${row.metric_category}-${row.metric_name}`;
      if (!groupedByMetric[key]) {
        groupedByMetric[key] = [];
      }
      groupedByMetric[key].push(row);
    });

    Object.entries(groupedByMetric).forEach(([key, values]) => {
      const points = values.map((v, idx) => {
        let percentageChange = 0;
        if (idx > 0) {
          const prev = values[idx - 1].value;
          percentageChange = prev > 0 ? ((v.value - prev) / prev) * 100 : 0;
        }

        return {
          date: v.date,
          category: v.metric_category,
          metric: v.metric_name,
          value: v.value,
          percentageChange: Math.round(percentageChange * 10) / 10,
        };
      });

      processedData.push({
        category: values[0].metric_category,
        metric: values[0].metric_name,
        data: points,
      });
    });

    res.json(processedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch performance data" });
  }
});

// Get latest physical assessment for spider chart
router.get("/athlete/:athleteId/physical", async (req, res) => {
  try {
    const { athleteId } = req.params;

    const latestAssessmentResult = await pool.query(
      `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
      [athleteId, req.user.teamId]
    );

    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [], overallScore: 0 });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Pemeriksaan Fisik'
    `,
      [latestAssessment.id]
    );
    const metrics = metricsResult.rows;

    // Calculate overall fitness score (average of all physical metrics)
    const totalValue = metrics.reduce((sum, m) => sum + m.value, 0);
    const overallScore =
      metrics.length > 0
        ? Math.round((totalValue / (metrics.length * 10)) * 100)
        : 0;

    res.json({
      date: latestAssessment.date,
      metrics: metrics.map((m) => ({
        metric: m.metric_name,
        value: m.value,
        maxValue: 10,
      })),
      overallScore,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch physical data" });
  }
});

// Get mental health data
router.get("/athlete/:athleteId/mental", async (req, res) => {
  try {
    const { athleteId } = req.params;

    const latestAssessmentResult = await pool.query(
      `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
      [athleteId, req.user.teamId]
    );

    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [] });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Kesehatan Mental'
    `,
      [latestAssessment.id]
    );
    const metrics = metricsResult.rows;

    res.json({
      date: latestAssessment.date,
      metrics: metrics.map((m) => ({
        metric: m.metric_name,
        value: m.value,
        maxValue: 10,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch mental health data" });
  }
});

// Get sleep quality data
router.get("/athlete/:athleteId/sleep", async (req, res) => {
  try {
    const { athleteId } = req.params;

    const latestAssessmentResult = await pool.query(
      `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
      [athleteId, req.user.teamId]
    );
    
    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [], warning: null });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Kualitas Tidur'
    `,
      [latestAssessment.id]
    );
    const metrics = metricsResult.rows;

    // Check for sleep warning
    const avgSleep = metrics.find(
      (m) => m.metric_name === "Rata-rata Jam Tidur"
    );
    const warning =
      avgSleep && avgSleep.value < 7
        ? "Atlet kurang tidur! Disarankan minimal 7-9 jam per malam."
        : null;

    res.json({
      date: latestAssessment.date,
      metrics: metrics.map((m) => ({
        metric: m.metric_name,
        value: m.value,
        maxValue: m.metric_name === "Rata-rata Jam Tidur" ? 12 : 10,
      })),
      warning,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch sleep data" });
  }
});

// Get team overview
router.get("/team/overview", async (req, res) => {
  try {
    const athletesResult = await pool.query(
      `
      SELECT 
        id, name, position, status, last_assessment_date
      FROM athletes
      WHERE team_id = $1
      ORDER BY name
    `,
      [req.user.teamId]
    );
    const athletes = athletesResult.rows;

    // Get status distribution
    const statusCounts = {
      Prima: 0,
      Fit: 0,
      Pemulihan: 0,
      Rehabilitasi: 0,
    };

    athletes.forEach((a) => {
      statusCounts[a.status]++;
    });

    // Get position distribution
    const positionCounts = {
      Striker: 0,
      Midfielder: 0,
      Defender: 0,
      Goalkeeper: 0,
    };

    athletes.forEach((a) => {
      positionCounts[a.position]++;
    });

    // Calculate team average physical score
    const recentAssessmentsResult = await pool.query(
      `
      SELECT DISTINCT ON (a.athlete_id) 
        am.value
      FROM assessments a
      JOIN assessment_metrics am ON a.id = am.assessment_id
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE ath.team_id = $1 
        AND am.metric_category = 'Pemeriksaan Fisik'
      ORDER BY a.athlete_id, a.date DESC
    `,
      [req.user.teamId]
    );
    const recentAssessments = recentAssessmentsResult.rows;

    const avgTeamFitness =
      recentAssessments.length > 0
        ? Math.round(
            (recentAssessments.reduce((sum, r) => sum + r.value, 0) /
              recentAssessments.length) *
              10
          )
        : 0;

    res.json({
      totalAthletes: athletes.length,
      statusDistribution: statusCounts,
      positionDistribution: positionCounts,
      avgTeamFitness,
      athletes: athletes.map((a) => ({
        id: a.id,
        name: a.name,
        position: a.position,
        status: a.status,
        lastAssessment: a.last_assessment_date,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch team overview" });
  }
});

module.exports = router;
