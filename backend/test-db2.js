const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_1hMNBLrO7tkG@ep-cold-dream-appdlmxo.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 5000,
});

async function test() {
  try {
    console.log('Connecting...');
    const client = await pool.connect();
    console.log('Connected! Executing query...');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

test();
