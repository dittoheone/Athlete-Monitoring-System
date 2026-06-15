require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const athleteRes = await client.query("SELECT id FROM athletes WHERE name = 'Reza Pratama'");
    if (athleteRes.rows.length === 0) {
      console.log("Reza Pratama not found");
      return;
    }
    const athleteId = athleteRes.rows[0].id;
    
    const assessmentRes = await client.query("SELECT id FROM assessments WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1", [athleteId]);
    if (assessmentRes.rows.length === 0) {
      console.log("No assessment found for Reza");
      return;
    }
    const assessmentId = assessmentRes.rows[0].id;

    const metricsRes = await client.query("SELECT metric_name, value FROM assessment_metrics WHERE assessment_id = $1", [assessmentId]);
    console.log("Reza's metrics:", metricsRes.rows);

    const rulesRes = await client.query("SELECT * FROM recommendation_rules");
    console.log("Rules in DB:", rulesRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
