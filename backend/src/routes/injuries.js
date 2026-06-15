const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get injuries for a team
router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const teamId = req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);

    let query = `
      SELECT i.*, a.name as athlete_name 
      FROM injury_records i
      JOIN athletes a ON i.athlete_id = a.id
      WHERE a.team_id = $1 AND i.deleted_at IS NULL
      ORDER BY i.date DESC
    `;
    let params = [teamId];

    if (!isNaN(page) && !isNaN(limit)) {
      const offset = (page - 1) * limit;
      query += ` LIMIT $2 OFFSET $3`;
      params.push(limit, offset);

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM injury_records i JOIN athletes a ON i.athlete_id = a.id WHERE a.team_id = $1 AND i.deleted_at IS NULL`,
        [teamId]
      );
      const totalCount = parseInt(countRes.rows[0].count);
      const totalPages = Math.ceil(totalCount / limit);

      const result = await pool.query(query, params);
      res.json({ data: result.rows, totalCount, totalPages, currentPage: page });
    } else {
      const result = await pool.query(query, params);
      res.json(result.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch injuries" });
  }
});

// Create injury
router.post("/", authorizeRole("medis"), async (req, res) => {
  try {
    const { athleteId, injuryType, severityLevel, status, estimatedRecovery, notes, date } = req.body;
    if (!athleteId || !injuryType || !severityLevel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // IDOR Check: Ensure athlete belongs to the user's team
    const athleteCheck = await pool.query(
      "SELECT id FROM athletes WHERE id = $1 AND team_id = $2",
      [athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]
    );
    if (athleteCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied. Athlete not found in your team." });
    }

    const finalStatus = status || 'Aktif';
    const result = await pool.query(`
      INSERT INTO injury_records (athlete_id, injury_type, severity_level, status, estimated_recovery, notes, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [athleteId, injuryType, severityLevel, finalStatus, estimatedRecovery, notes, date || new Date()]);

    let athleteStatus = 'Cedera'; // default for Aktif
    if (finalStatus === 'Masa Penyembuhan') athleteStatus = 'Rehabilitasi';
    else if (finalStatus === 'Sudah Sembuh' || finalStatus === 'Dalam Pantauan') athleteStatus = 'Underperform';
    
    await pool.query("UPDATE athletes SET status = $1 WHERE id = $2", [athleteStatus, athleteId]);

    res.status(201).json({ message: "Injury recorded", injuryId: result.rows[0].id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record injury" });
  }
});

// Update injury status
router.put("/:id", authorizeRole("medis"), async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    // IDOR Check: Ensure the injury belongs to an athlete in the user's team
    const injuryCheck = await pool.query(`
      SELECT ir.id, ir.athlete_id FROM injury_records ir
      JOIN athletes a ON ir.athlete_id = a.id
      WHERE ir.id = $1 AND a.team_id = $2
    `, [req.params.id, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);

    if (injuryCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied. Injury not found in your team." });
    }

    await pool.query(
      "UPDATE injury_records SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3",
      [status, notes, req.params.id]
    );

    if (status) {
      const athleteId = injuryCheck.rows[0].athlete_id;
      let athleteStatus = 'Cedera';
      if (status === 'Masa Penyembuhan') athleteStatus = 'Rehabilitasi';
      else if (status === 'Sudah Sembuh' || status === 'Dalam Pantauan') athleteStatus = 'Underperform';
      
      await pool.query("UPDATE athletes SET status = $1 WHERE id = $2", [athleteStatus, athleteId]);
    }

    if (req.user && req.user.id && status) {
      await logActivity(req.user.id, `Memperbarui status cedera atlet (ID Cedera: ${req.params.id}) menjadi ${status}`, "Aktivitas", "Berhasil", req.ip);
    }

    res.json({ message: "Injury updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update injury" });
  }
});

// Delete injury (Soft delete)
router.delete("/:id", authorizeRole("medis"), async (req, res) => {
  try {
    await pool.query("UPDATE injury_records SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2", [req.user.id, req.params.id]);
    res.json({ message: "Injury moved to Recycle Bin" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete injury" });
  }
});

module.exports = router;
