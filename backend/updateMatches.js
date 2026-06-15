require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query("UPDATE matches SET result_status = 'W' WHERE score = '2-1' OR score = '3-0'");
    await client.query("UPDATE matches SET result_status = 'D' WHERE score = '1-1' OR score = '2-2'");
    await client.query("UPDATE matches SET result_status = 'L' WHERE score = '0-2'");
    console.log("Updated dummy match statuses.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}
run();
