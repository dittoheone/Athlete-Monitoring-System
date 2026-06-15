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

    const tables = [
      'athletes',
      'users',
      'teams',
      'injury_records',
      'training_programs',
      'exercise_library',
      'team_schedules'
    ];

    for (const table of tables) {
      console.log(`Migrating ${table}...`);
      await client.query(`
        ALTER TABLE ${table}
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS deleted_by INTEGER DEFAULT NULL
      `);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during migration:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
