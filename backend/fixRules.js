require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log("Updating Recommendation Rules to match exact metric names...");
    
    // Rule 1
    await client.query(`
      UPDATE recommendation_rules 
      SET trigger_condition = '{"Skor Stres (1-10)": ">7"}'
      WHERE priority = 1
    `);

    // Rule 2
    await client.query(`
      UPDATE recommendation_rules 
      SET trigger_condition = '{"Durasi Tidur (Jam)": "<6", "Kecepatan (Sprint 30m) (Detik)": ">4.5"}'
      WHERE priority = 2
    `);

    // Rule 3
    await client.query(`
      UPDATE recommendation_rules 
      SET trigger_condition = '{"Daya Tahan (VO2 Max) (mL/kg/min)": "<45"}'
      WHERE priority = 3
    `);

    // Tweak Reza Pratama
    const athleteRes = await client.query("SELECT id FROM athletes WHERE name = 'Reza Pratama'");
    if (athleteRes.rows.length > 0) {
      const athleteId = athleteRes.rows[0].id;
      const assessmentRes = await client.query("SELECT id FROM assessments WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1", [athleteId]);
      
      if (assessmentRes.rows.length > 0) {
        const assessmentId = assessmentRes.rows[0].id;

        // Update exact metric names
        await client.query("UPDATE assessment_metrics SET value = 5 WHERE assessment_id = $1 AND metric_name = 'Durasi Tidur (Jam)'", [assessmentId]);
        await client.query("UPDATE assessment_metrics SET value = 4.8 WHERE assessment_id = $1 AND metric_name = 'Kecepatan (Sprint 30m) (Detik)'", [assessmentId]);

        console.log("Reza's metrics successfully updated.");
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
