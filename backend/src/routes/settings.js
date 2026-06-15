const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get settings
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM team_settings WHERE team_id = $1", [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update settings
router.put("/", authorizeRole("medis"), async (req, res) => {
  try {
    const { thresholdPrima, thresholdUnderperform, weightFisik, weightBia, weightMental, weightTidur } = req.body;
    
    await pool.query(`
      UPDATE team_settings 
      SET threshold_prima = COALESCE($1, threshold_prima),
          threshold_underperform = COALESCE($2, threshold_underperform),
          weight_fisik = COALESCE($3, weight_fisik),
          weight_bia = COALESCE($4, weight_bia),
          weight_mental = COALESCE($5, weight_mental),
          weight_tidur = COALESCE($6, weight_tidur)
      WHERE team_id = $7
    `, [thresholdPrima, thresholdUnderperform, weightFisik, weightBia, weightMental, weightTidur, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    
    await logActivity(req.user.id, "Menyesuaikan Bobot SPK", "Sistem", "Berhasil", req.ip);
    res.json({ message: "Settings updated" });
  } catch (error) {
    console.error(error);
    await logActivity(req.user.id, "Menyesuaikan Bobot SPK", "Sistem", "Gagal", req.ip);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Get standards
router.get("/standards", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM team_standards WHERE team_id = $1", [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch standards" });
  }
});

// Update standard
router.put("/standards", authorizeRole("medis"), async (req, res) => {
  try {
    const { position, metricName, standardValue } = req.body;
    if (!position || !metricName || standardValue === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    await pool.query(
      "INSERT INTO team_standards (team_id, position, metric_name, standard_value) VALUES ($1, $2, $3, $4) ON CONFLICT (team_id, position, metric_name) DO UPDATE SET standard_value = EXCLUDED.standard_value",
      [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), position, metricName, standardValue]
    );

    await logActivity(req.user.id, `Update Standar Fisik (${position})`, "Sistem", "Berhasil", req.ip);
    res.json({ message: "Standard updated" });
  } catch (error) {
    console.error(error);
    await logActivity(req.user.id, `Update Standar Fisik (${req.body.position})`, "Sistem", "Gagal", req.ip);
    res.status(500).json({ error: "Failed to update standard" });
  }
});

module.exports = router;
