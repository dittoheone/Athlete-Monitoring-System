require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT DISTINCT assessment_id 
      FROM assessment_metrics 
      WHERE metric_category = 'Pemeriksaan Fisik'
    `);
    
    let backfillCount = 0;
    for (const row of res.rows) {
      const assessmentId = row.assessment_id;
      
      const checkKelincahan = await client.query(
        "SELECT id FROM assessment_metrics WHERE assessment_id = $1 AND metric_name = 'Kelincahan (Agility) (Detik)'",
        [assessmentId]
      );
      
      if (checkKelincahan.rows.length === 0) {
        const agility = Math.round(4 + Math.random() * 2);
        await client.query(
          "INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)",
          [assessmentId, 'Pemeriksaan Fisik', 'Kelincahan (Agility) (Detik)', agility]
        );
        backfillCount++;
      }

      const checkKeseimbangan = await client.query(
        "SELECT id FROM assessment_metrics WHERE assessment_id = $1 AND metric_name = 'Keseimbangan (Balance) (Skor)'",
        [assessmentId]
      );
      
      if (checkKeseimbangan.rows.length === 0) {
        const balance = Math.round(5 + Math.random() * 5);
        await client.query(
          "INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)",
          [assessmentId, 'Pemeriksaan Fisik', 'Keseimbangan (Balance) (Skor)', balance]
        );
        backfillCount++;
      }
    }

    console.log(`Backfilled ${backfillCount} missing physical metrics.`);

  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
