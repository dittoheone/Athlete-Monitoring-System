require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // 1. Get an athlete (just get the first one)
    const athRes = await client.query('SELECT id FROM athletes LIMIT 2');
    if (athRes.rows.length === 0) return console.log('No athletes');

    // 2. Get some exercises
    const exRes = await client.query('SELECT id FROM exercise_library LIMIT 3');
    if (exRes.rows.length === 0) return console.log('No exercises');

    const athlete1 = athRes.rows[0].id;
    const athlete2 = athRes.rows[1]?.id || athlete1;

    // 3. Insert some training programs
    await client.query(`
      INSERT INTO training_programs (athlete_id, exercise_id, frequency, intensity, sets, reps)
      VALUES 
      ($1, $3, '3x Seminggu', 'Medium', 3, 12),
      ($1, $4, 'Setiap Hari', 'Low', 2, 15),
      ($2, $5, '2x Seminggu', 'High', 4, 8)
    `, [athlete1, athlete2, exRes.rows[0].id, exRes.rows[1].id, exRes.rows[2].id]);

    console.log('Dummy programs inserted!');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
