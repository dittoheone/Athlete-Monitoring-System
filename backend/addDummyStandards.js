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

    const newStandards = [
      // Midfielder: Needs high endurance and agility
      ['Midfielder', 'Kecepatan (Sprint 30m) (detik)', 4.2],
      ['Midfielder', 'Kekuatan (1RM Squat) (kg)', 110],
      ['Midfielder', 'Daya Tahan (VO2 Max) (mL/kg/min)', 60],
      ['Midfielder', 'Kelincahan (Illinois) (detik)', 15.5],
      ['Midfielder', 'Keseimbangan (Y-Balance) (cm)', 95],
      
      // Defender: Needs high strength and balance
      ['Defender', 'Kecepatan (Sprint 30m) (detik)', 4.3],
      ['Defender', 'Kekuatan (1RM Squat) (kg)', 130],
      ['Defender', 'Daya Tahan (VO2 Max) (mL/kg/min)', 50],
      ['Defender', 'Kelincahan (Illinois) (detik)', 17.0],
      ['Defender', 'Keseimbangan (Y-Balance) (cm)', 95],
      
      // Goalkeeper: Needs extreme agility and sprint speed over short distances
      ['Goalkeeper', 'Kecepatan (Sprint 30m) (detik)', 4.1],
      ['Goalkeeper', 'Kekuatan (1RM Squat) (kg)', 115],
      ['Goalkeeper', 'Daya Tahan (VO2 Max) (mL/kg/min)', 45],
      ['Goalkeeper', 'Kelincahan (Illinois) (detik)', 15.0],
      ['Goalkeeper', 'Keseimbangan (Y-Balance) (cm)', 100],
    ];

    for (const std of newStandards) {
      await client.query(`
        INSERT INTO team_standards (team_id, position, metric_name, standard_value)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [teamId, ...std]);
    }

    console.log('Dummy standards inserted successfully!');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
