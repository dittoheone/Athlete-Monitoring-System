require('dotenv').config();
const { Pool } = require('pg');
const config = require('./src/utils/config');

const poolConfig = config.DATABASE_URL
  ? { connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : { host: config.DB_HOST, port: config.DB_PORT, database: config.DB_NAME, user: config.DB_USER, password: config.DB_PASSWORD };

const pool = new Pool(poolConfig);

async function run() {
  const client = await pool.connect();
  try {
    // Add unique constraint
    await client.query(`
      ALTER TABLE athletes ADD CONSTRAINT unique_name_team UNIQUE (name, team_id);
    `);
    console.log("Successfully added UNIQUE constraint to athletes table.");
  } catch (error) {
    if (error.code === '42P04' || error.code === '42710') {
      console.log("Constraint already exists or similar error:", error.message);
    } else {
      console.error(error);
    }
  } finally {
    client.release();
    pool.end();
  }
}

run();
