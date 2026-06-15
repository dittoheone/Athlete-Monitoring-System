const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLogger");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Admin-only: Get all soft-deleted items across the system
router.get("/:type", authorizeRole("admin"), async (req, res) => {
  try {
    const { type } = req.params;
    let query = "";

    switch (type) {
      case "athletes":
        query = `
          SELECT a.id, a.name, a.position as detail, a.deleted_at, a.deleted_by, u.name as deleted_by_name, t.name as team_name
          FROM athletes a
          LEFT JOIN users u ON a.deleted_by = u.id
          LEFT JOIN teams t ON a.team_id = t.id
          WHERE a.deleted_at IS NOT NULL
          ORDER BY a.deleted_at DESC
        `;
        break;
      case "users":
        query = `
          SELECT u.id, u.name, u.role as detail, u.deleted_at, u.deleted_by, u2.name as deleted_by_name, t.name as team_name
          FROM users u
          LEFT JOIN users u2 ON u.deleted_by = u2.id
          LEFT JOIN teams t ON u.team_id = t.id
          WHERE u.deleted_at IS NOT NULL
          ORDER BY u.deleted_at DESC
        `;
        break;
      case "teams":
        query = `
          SELECT t.id, t.name, 'Tim' as detail, t.deleted_at, t.deleted_by, u.name as deleted_by_name
          FROM teams t
          LEFT JOIN users u ON t.deleted_by = u.id
          WHERE t.deleted_at IS NOT NULL
          ORDER BY t.deleted_at DESC
        `;
        break;
      case "injuries":
        query = `
          SELECT i.id, a.name as name, i.injury_type as detail, i.deleted_at, i.deleted_by, u.name as deleted_by_name, t.name as team_name
          FROM injury_records i
          JOIN athletes a ON i.athlete_id = a.id
          LEFT JOIN users u ON i.deleted_by = u.id
          LEFT JOIN teams t ON a.team_id = t.id
          WHERE i.deleted_at IS NOT NULL
          ORDER BY i.deleted_at DESC
        `;
        break;
      case "exercises":
        query = `
          SELECT e.id, e.name, e.type as detail, e.deleted_at, e.deleted_by, u.name as deleted_by_name
          FROM exercise_library e
          LEFT JOIN users u ON e.deleted_by = u.id
          WHERE e.deleted_at IS NOT NULL
          ORDER BY e.deleted_at DESC
        `;
        break;
      case "schedules":
        query = `
          SELECT s.id, s.title as name, s.session_type as detail, s.deleted_at, s.deleted_by, u.name as deleted_by_name, t.name as team_name
          FROM team_schedules s
          LEFT JOIN users u ON s.deleted_by = u.id
          LEFT JOIN teams t ON s.team_id = t.id
          WHERE s.deleted_at IS NOT NULL
          ORDER BY s.deleted_at DESC
        `;
        break;
      default:
        return res.status(400).json({ error: "Invalid type" });
    }

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch deleted items" });
  }
});

// Admin-only: Restore soft-deleted item
router.post("/:type/:id/restore", authorizeRole("admin"), async (req, res) => {
  try {
    const { type, id } = req.params;
    let tableName = "";
    let itemName = "Item";

    switch (type) {
      case "athletes": tableName = "athletes"; itemName = "Atlet"; break;
      case "users": tableName = "users"; itemName = "Pengguna"; break;
      case "teams": tableName = "teams"; itemName = "Tim"; break;
      case "injuries": tableName = "injury_records"; itemName = "Catatan Cedera"; break;
      case "exercises": tableName = "exercise_library"; itemName = "Program Latihan"; break;
      case "schedules": tableName = "team_schedules"; itemName = "Jadwal"; break;
      default:
        return res.status(400).json({ error: "Invalid type" });
    }

    // Restore by setting deleted_at to NULL
    const result = await pool.query(
      `UPDATE ${tableName} SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found in Recycle Bin" });
    }

    if (req.user && req.user.id) {
      await logActivity(req.user.id, `Memulihkan ${itemName} (ID: ${id}) dari Recycle Bin`, "Aktivitas", "Berhasil", req.ip);
    }

    res.json({ message: "Item restored successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to restore item" });
  }
});

module.exports = router;
