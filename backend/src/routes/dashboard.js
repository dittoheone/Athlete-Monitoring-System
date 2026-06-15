const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get athlete performance tracking data
router.get("/athlete/:athleteId/performance", async (req, res) => {
  try {
    const { athleteId } = req.params;
    const { category, metric } = req.query;

    // Verify athlete belongs to user's team and fetch position
    const athleteResult = await pool.query(
      "SELECT id, position FROM athletes WHERE id = $1 AND team_id = $2",
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
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

    // Fetch standard benchmarks for normalizations
    const stdRes = await pool.query(
      "SELECT metric_name, standard_value FROM team_standards WHERE team_id = $1 AND position = $2", 
      [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), athlete.position]
    );
    const standards = {};
    stdRes.rows.forEach(r => standards[r.metric_name] = r.standard_value);

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
            const prev = parseFloat(values[idx - 1].value) || 0;
            const current = parseFloat(v.value) || 0;
            percentageChange = prev > 0 ? ((current - prev) / prev) * 100 : 0;
          }

          let score = 0;
          const val = parseFloat(v.value) || 0;
          const cat = v.metric_category.toLowerCase();
          const name = v.metric_name.toLowerCase();

          if (cat.includes('fisik') || cat.includes('physical')) {
            const ideal = parseFloat(standards[v.metric_name]) || val || 1;
            if (name.includes('sprint') || name.includes('illinois')) {
              score = Math.min(100, (ideal / (val || 1)) * 100);
            } else {
              score = Math.min(100, (val / ideal) * 100);
            }
          } else {
             // Normalize Mental/Sleep to 0-100 too for unified charts
             score = val > 10 ? 100 : val * 10;
          }

          return {
            date: v.date,
            category: v.metric_category,
            metric: v.metric_name,
            value: v.value,
            normalizedScore: Math.round(score),
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
      SELECT a.id, a.date, ath.position
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [], overallScore: 0 });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Fisik & BIA'
    `,
      [latestAssessment.id]
    );
    const metrics = metricsResult.rows;

    // Fetch standards
    const stdRes = await pool.query(
      "SELECT metric_name, standard_value FROM team_standards WHERE team_id = $1 AND position = $2", 
      [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), latestAssessment.position]
    );
    const standards = {};
    stdRes.rows.forEach(r => standards[r.metric_name] = r.standard_value);

    // Calculate overall fitness score (normalized 0-100 based on standard values)
    let totalScore = 0;
    let scoreCount = 0;
    
    const processedMetrics = metrics.map(m => {
      let score = 0;
      const val = parseFloat(m.value) || 0;
      const ideal = parseFloat(standards[m.metric_name]) || val || 1;
      const name = m.metric_name.toLowerCase();

      if (name.includes('sprint') || name.includes('illinois')) {
        score = Math.min(100, (ideal / (val || 1)) * 100);
      } else {
        score = Math.min(100, (val / ideal) * 100);
      }
      
      totalScore += score;
      scoreCount++;

      return {
        metric: m.metric_name,
        value: m.value,
        normalizedScore: Math.round(score),
        maxValue: 100,
      };
    });

    const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    res.json({
      date: latestAssessment.date,
      metrics: processedMetrics,
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
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );

    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [] });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Mental & Tidur'
    `,
      [latestAssessment.id]
    );
    // Filter only mental metrics
    const metrics = metricsResult.rows.filter(m => 
      !m.metric_name.toLowerCase().includes('tidur') && 
      !m.metric_name.toLowerCase().includes('sleep')
    );

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
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );
    
    const latestAssessment = latestAssessmentResult.rows[0];

    if (!latestAssessment) {
      return res.json({ metrics: [], warning: null });
    }

    const metricsResult = await pool.query(
      `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Mental & Tidur'
    `,
      [latestAssessment.id]
    );
    // Filter only sleep metrics
    const metrics = metricsResult.rows.filter(m => 
      m.metric_name.toLowerCase().includes('tidur') || 
      m.metric_name.toLowerCase().includes('sleep')
    );

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
    const { getTeamOverview } = require("../database/queries");
    const athletes = await getTeamOverview((req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)));

    // Get status distribution
    const statusCounts = {
      Prima: 0,
      Fit: 0,
      Underperform: 0,
      Cedera: 0,
      Rehabilitasi: 0,
    };

    athletes.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      } else {
        statusCounts[a.status] = 1;
      }
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

    const avgTeamFitness = athletes.length > 0 
      ? Math.round(athletes.reduce((sum, a) => sum + (a.fisikScore || 0), 0) / athletes.length) 
      : 0;

    // Calculate team averages for mental and tidur
    const avgTeamMental = athletes.length > 0 
      ? Math.round(athletes.reduce((sum, a) => sum + (a.mentalScore || 0), 0) / athletes.length) 
      : 0;
    const avgTeamTidur = athletes.length > 0
      ? (athletes.reduce((sum, a) => sum + (a.tidurDurasi || 0), 0) / athletes.length).toFixed(1)
      : 0;

    res.json({
      totalAthletes: athletes.length,
      statusDistribution: statusCounts,
      positionDistribution: positionCounts,
      avgTeamFitness,
      avgTeamMental,
      avgTeamTidur,
      athletes: athletes.map((a) => ({
        id: a.id,
        name: a.name,
        position: a.position,
        status: a.status,
        lastAssessment: a.last_assessment_date,
        spkScore: a.spkScore,
        fisikScore: a.fisikScore,
        mentalScore: a.mentalScore,
        tidurDurasi: a.tidurDurasi,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch team overview" });
  }
});

// Get team alerts
router.get("/team/alerts", async (req, res) => {
  try {
    const alerts = [];
    
    // Check balance
    const balanceRes = await pool.query(`
      WITH RankedAssessments AS (
        SELECT a.id, a.athlete_id
        FROM assessments a
        JOIN athletes ath ON a.athlete_id = ath.id
        WHERE ath.team_id = $1
        ORDER BY a.athlete_id, a.date DESC
      ), Latest AS (
        SELECT DISTINCT ON (athlete_id) id, athlete_id FROM RankedAssessments
      )
      SELECT ath.id, ath.name, am.value 
      FROM assessment_metrics am
      JOIN Latest l ON am.assessment_id = l.id
      JOIN athletes ath ON l.athlete_id = ath.id
      WHERE am.metric_name = 'Keseimbangan (Y-Balance) (Cm)' AND am.value < 80
      ORDER BY am.value ASC
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    
    if (balanceRes.rows.length > 0) {
      alerts.push({
        type: 'orange',
        title: `${balanceRes.rows.length} atlet di bawah standar keseimbangan`,
        subtitle: 'Perlu perhatian segera',
        athletes: balanceRes.rows
      });
    }

    // Check sleep
    const sleepRes = await pool.query(`
      WITH RankedAssessments AS (
        SELECT a.id, a.athlete_id
        FROM assessments a
        JOIN athletes ath ON a.athlete_id = ath.id
        WHERE ath.team_id = $1
        ORDER BY a.athlete_id, a.date DESC
      ), Latest AS (
        SELECT DISTINCT ON (athlete_id) id, athlete_id FROM RankedAssessments
      )
      SELECT ath.id, ath.name, am.value 
      FROM assessment_metrics am
      JOIN Latest l ON am.assessment_id = l.id
      JOIN athletes ath ON l.athlete_id = ath.id
      WHERE am.metric_name = 'Durasi Tidur (Jam)' AND am.value < 7
      ORDER BY am.value ASC
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    
    if (sleepRes.rows.length > 0) {
      alerts.push({
        type: 'orange',
        title: `${sleepRes.rows.length} atlet melaporkan tidur kurang`,
        subtitle: 'Durasi tidur < 7 Jam',
        athletes: sleepRes.rows
      });
    }

    // Check VO2 Max
    const vo2Res = await pool.query(`
      WITH RankedAssessments AS (
        SELECT a.id, a.athlete_id
        FROM assessments a
        JOIN athletes ath ON a.athlete_id = ath.id
        WHERE ath.team_id = $1
        ORDER BY a.athlete_id, a.date DESC
      ), Latest AS (
        SELECT DISTINCT ON (athlete_id) id, athlete_id FROM RankedAssessments
      )
      SELECT ath.id, ath.name, am.value 
      FROM assessment_metrics am
      JOIN Latest l ON am.assessment_id = l.id
      JOIN athletes ath ON l.athlete_id = ath.id
      WHERE am.metric_name = 'Daya Tahan (VO2 Max) (mL/kg/min)' AND am.value < 45
      ORDER BY am.value ASC
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    
    if (vo2Res.rows.length > 0) {
      alerts.push({
        type: 'red',
        title: `${vo2Res.rows.length} atlet VO2 Max di bawah standar`,
        subtitle: 'Daya tahan perlu ditingkatkan',
        athletes: vo2Res.rows
      });
    }

    // Check Agility
    const agilityRes = await pool.query(`
      WITH RankedAssessments AS (
        SELECT a.id, a.athlete_id
        FROM assessments a
        JOIN athletes ath ON a.athlete_id = ath.id
        WHERE ath.team_id = $1
        ORDER BY a.athlete_id, a.date DESC
      ), Latest AS (
        SELECT DISTINCT ON (athlete_id) id, athlete_id FROM RankedAssessments
      )
      SELECT ath.id, ath.name, am.value 
      FROM assessment_metrics am
      JOIN Latest l ON am.assessment_id = l.id
      JOIN athletes ath ON l.athlete_id = ath.id
      WHERE am.metric_name = 'Kelincahan (Illinois) (Detik)' AND am.value > 17
      ORDER BY am.value DESC
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    
    if (agilityRes.rows.length > 0) {
      alerts.push({
        type: 'red',
        title: `${agilityRes.rows.length} atlet kelincahan di bawah standar`,
        subtitle: 'Waktu Illinois lambat (>17 detik)',
        athletes: agilityRes.rows
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

module.exports = router;
