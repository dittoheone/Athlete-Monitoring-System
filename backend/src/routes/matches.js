const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get matches for team
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, 
             ROUND(AVG(s.rating)::numeric, 1) as average_rating,
             COALESCE(SUM(s.goals), 0) as total_goals
      FROM matches m
      LEFT JOIN match_statistics s ON m.id = s.match_id
      WHERE m.team_id = $1 
      GROUP BY m.id
      ORDER BY m.match_date DESC
    `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// Create match
router.post("/", authorizeRole("pelatih"), async (req, res) => {
  try {
    const { opponentName, matchDate, venue, competition, resultStatus, score, stats } = req.body;
    if (!opponentName || !matchDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const matchResult = await client.query(`
        INSERT INTO matches (team_id, opponent_name, match_date, venue, competition, result_status, score)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [(req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)), opponentName, matchDate, venue, competition, resultStatus, score]);
      
      const matchId = matchResult.rows[0].id;

      if (stats && Array.isArray(stats)) {
        for (const stat of stats) {
          await client.query(`
            INSERT INTO match_statistics (match_id, athlete_id, minutes_played, goals, assists, yellow_cards, red_cards, rating)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [matchId, stat.athleteId, stat.minutesPlayed, stat.goals, stat.assists, stat.yellowCards, stat.redCards, stat.rating]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ message: "Match created", matchId });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create match" });
  }
});

// Get match stats
router.get("/:id/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ms.*, a.name as athlete_name 
      FROM match_statistics ms
      JOIN athletes a ON ms.athlete_id = a.id
      WHERE ms.match_id = $1
    `, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Add stats to existing match
router.post("/:id/stats", authorizeRole("pelatih"), async (req, res) => {
  try {
    const matchId = req.params.id;
    const { athleteId, minutesPlayed, goals, assists, yellowCards, redCards, rating } = req.body;
    
    // Check if stat for this athlete already exists
    const checkResult = await pool.query(
      "SELECT id FROM match_statistics WHERE match_id = $1 AND athlete_id = $2",
      [matchId, athleteId]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: "Statistik untuk pemain ini sudah ada di pertandingan ini." });
    }

    let finalRating = 6.0; // Baseline
    
    // Automatic Algorithm
    const mins = parseInt(minutesPlayed) || 0;
    const g = parseInt(goals) || 0;
    const a = parseInt(assists) || 0;
    const yc = parseInt(yellowCards) || 0;
    const rc = parseInt(redCards) || 0;

    if (mins >= 45) finalRating += 0.5;
    else if (mins > 0 && mins < 45) finalRating -= 0.5;

    finalRating += g * 1.5;
    finalRating += a * 1.0;
    finalRating -= yc * 0.5;
    finalRating -= rc * 2.0;

    finalRating = Math.max(1, Math.min(10, finalRating));
    finalRating = parseFloat(finalRating.toFixed(1));

    const result = await pool.query(`
      INSERT INTO match_statistics (match_id, athlete_id, minutes_played, goals, assists, yellow_cards, red_cards, rating)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [matchId, athleteId, minutesPlayed || 0, goals || 0, assists || 0, yellowCards || 0, redCards || 0, finalRating]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add match stat" });
  }
});

module.exports = router;
