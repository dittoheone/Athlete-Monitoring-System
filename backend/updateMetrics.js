require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`UPDATE assessment_metrics SET value = 42 WHERE metric_name = 'Daya Tahan (VO2 Max) (mL/kg/min)' AND id IN (SELECT id FROM assessment_metrics WHERE metric_name = 'Daya Tahan (VO2 Max) (mL/kg/min)' LIMIT 2)`);
    console.log('Updated 2 VO2 Max to trigger alerts');
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
