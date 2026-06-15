const { pool } = require('./src/database/init');

async function dropAll() {
  try {
    console.log('Dropping all tables...');
    await pool.query(`
      DROP TABLE IF EXISTS team_settings CASCADE;
      DROP TABLE IF EXISTS team_standards CASCADE;
      DROP TABLE IF EXISTS match_statistics CASCADE;
      DROP TABLE IF EXISTS matches CASCADE;
      DROP TABLE IF EXISTS injury_records CASCADE;
      DROP TABLE IF EXISTS recommendation_rules CASCADE;
      DROP TABLE IF EXISTS criteria_weights CASCADE;
      DROP TABLE IF EXISTS training_programs CASCADE;
      DROP TABLE IF EXISTS exercise_library CASCADE;
      DROP TABLE IF EXISTS assessment_metrics CASCADE;
      DROP TABLE IF EXISTS assessments CASCADE;
      DROP TABLE IF EXISTS athletes CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS teams CASCADE;
    `);
    console.log('All tables dropped successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Error dropping tables:', e);
    process.exit(1);
  }
}

dropAll();
