const { pool } = require('./src/database/init');
const bcrypt = require('bcryptjs');

async function run() {
  try {
    const hash = await bcrypt.hash('password123', 12);
    await pool.query(
      "INSERT INTO users (name, email, password, role, team_id) VALUES ('Admin Super', 'admin@test.com', $1, 'admin', null) ON CONFLICT (email) DO NOTHING",
      [hash]
    );
    console.log('Admin user added');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
