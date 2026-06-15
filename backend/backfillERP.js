require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all assessments
    const assessmentsRes = await client.query('SELECT id FROM assessments');
    const assessments = assessmentsRes.rows;

    console.log(`Found ${assessments.length} assessments. Backfilling ERP data...`);

    for (const assessment of assessments) {
      // Randomly generate RPE and Soreness
      const rpe = Math.floor(Math.random() * 5) + 4; // 4 to 8
      const soreness = Math.floor(Math.random() * 4) + 2; // 2 to 5

      // Check if ERP data already exists for this assessment
      const checkRes = await client.query(
        "SELECT id FROM assessment_metrics WHERE assessment_id = $1 AND metric_category = 'ERP'",
        [assessment.id]
      );

      if (checkRes.rows.length === 0) {
        await client.query(
          "INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)",
          [assessment.id, 'ERP', 'RPE (Intensitas Latihan) (1-10)', rpe]
        );
        await client.query(
          "INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)",
          [assessment.id, 'ERP', 'Nyeri Otot (Soreness) (1-10)', soreness]
        );
      }
    }

    await client.query('COMMIT');
    console.log('ERP dummy data backfill completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
