require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Check team 
    const tRes = await client.query('SELECT id FROM teams LIMIT 1');
    if (tRes.rows.length === 0) return console.log("No team found.");
    const teamId = tRes.rows[0].id;

    // Create table if not exists (in case)
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_schedules (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        title TEXT NOT NULL,
        target TEXT NOT NULL,
        session_type TEXT NOT NULL,
        time_range TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Clear existing
    await client.query('DELETE FROM team_schedules');

    // Insert
    const futureDate = new Date();
    const schedules = [
      { date: new Date(futureDate.getTime() + 1 * 24*60*60*1000), title: "Tactical & Fitness", target: "All Players", sessionType: "Pagi", timeRange: "08:00 - 10:00" },
      { date: new Date(futureDate.getTime() + 2 * 24*60*60*1000), title: "Recovery Session", target: "Starting XI", sessionType: "Sore", timeRange: "16:00 - 17:30" },
      { date: new Date(futureDate.getTime() + 3 * 24*60*60*1000), title: "Set Piece Practice", target: "All Players", sessionType: "Pagi", timeRange: "08:00 - 10:00" },
      { date: new Date(futureDate.getTime() + 4 * 24*60*60*1000), title: "Match vs Persija", target: "Match Squad", sessionType: "Sore", timeRange: "15:30 - 18:00" },
    ];
    
    for (const sch of schedules) {
      await client.query(`
        INSERT INTO team_schedules (team_id, date, title, target, session_type, time_range)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [teamId, sch.date, sch.title, sch.target, sch.sessionType, sch.timeRange]);
    }
    console.log(`Inserted ${schedules.length} schedules.`);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
