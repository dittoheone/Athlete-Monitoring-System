require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const teamRes = await client.query('SELECT id FROM teams LIMIT 1');
    if (teamRes.rows.length === 0) return console.log('No teams found');
    const teamId = teamRes.rows[0].id;

    // Clear existing standards
    await client.query('DELETE FROM team_standards');

    const newStandards = [
      // Striker
      ['Striker', 'Kecepatan (Sprint 30m) (Detik)', 4.0],
      ['Striker', 'Kekuatan (1RM Squat) (Kg)', 100],
      ['Striker', 'Daya Tahan (VO2 Max) (mL/kg/min)', 55],
      ['Striker', 'Kelincahan (Illinois) (Detik)', 14.5],
      ['Striker', 'Keseimbangan (Y-Balance) (Cm)', 90],
      ['Striker', 'InBody Score (0-100)', 80],
      ['Striker', 'Body Fat % (Opsional)', 10],

      // Midfielder
      ['Midfielder', 'Kecepatan (Sprint 30m) (Detik)', 4.2],
      ['Midfielder', 'Kekuatan (1RM Squat) (Kg)', 110],
      ['Midfielder', 'Daya Tahan (VO2 Max) (mL/kg/min)', 60],
      ['Midfielder', 'Kelincahan (Illinois) (Detik)', 15.5],
      ['Midfielder', 'Keseimbangan (Y-Balance) (Cm)', 95],
      ['Midfielder', 'InBody Score (0-100)', 80],
      ['Midfielder', 'Body Fat % (Opsional)', 10],
      
      // Defender
      ['Defender', 'Kecepatan (Sprint 30m) (Detik)', 4.3],
      ['Defender', 'Kekuatan (1RM Squat) (Kg)', 130],
      ['Defender', 'Daya Tahan (VO2 Max) (mL/kg/min)', 50],
      ['Defender', 'Kelincahan (Illinois) (Detik)', 17.0],
      ['Defender', 'Keseimbangan (Y-Balance) (Cm)', 95],
      ['Defender', 'InBody Score (0-100)', 80],
      ['Defender', 'Body Fat % (Opsional)', 12],
      
      // Goalkeeper
      ['Goalkeeper', 'Kecepatan (Sprint 30m) (Detik)', 4.1],
      ['Goalkeeper', 'Kekuatan (1RM Squat) (Kg)', 115],
      ['Goalkeeper', 'Daya Tahan (VO2 Max) (mL/kg/min)', 45],
      ['Goalkeeper', 'Kelincahan (Illinois) (Detik)', 15.0],
      ['Goalkeeper', 'Keseimbangan (Y-Balance) (Cm)', 100],
      ['Goalkeeper', 'InBody Score (0-100)', 80],
      ['Goalkeeper', 'Body Fat % (Opsional)', 12],
    ];

    for (const std of newStandards) {
      await client.query(`
        INSERT INTO team_standards (team_id, position, metric_name, standard_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [teamId, ...std]);
    }

    console.log('Standards updated with correct casing successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
