const { pool } = require('./src/database/init');

async function checkUsers() {
  try {
    const res = await pool.query('SELECT id, email, password, role FROM users');
    console.log('Users in DB:', res.rows);
    process.exit(0);
  } catch (err) {
    console.error('Error fetching users:', err);
    process.exit(1);
  }
}

checkUsers();
