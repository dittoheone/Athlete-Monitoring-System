const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('../utils/config');
const logger = require('../utils/logger');

// Create connection pool
const pool = new Pool({
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('✓ PostgreSQL connection established');
    return true;
  } catch (error) {
    logger.error('✗ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('medis', 'pelatih')),
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS athletes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position TEXT NOT NULL CHECK(position IN ('Striker', 'Midfielder', 'Defender', 'Goalkeeper')),
        status TEXT NOT NULL DEFAULT 'Fit' CHECK(status IN ('Prima', 'Fit', 'Pemulihan', 'Rehabilitasi')),
        last_assessment_date DATE
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE SET NULL,
        date DATE NOT NULL,
        weight_kg REAL,
        notes TEXT
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS assessment_metrics (
        id SERIAL PRIMARY KEY,
        assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
        metric_category TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value INTEGER NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercise_library (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        focus_area TEXT NOT NULL,
        description TEXT
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS training_programs (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
        frequency TEXT,
        intensity TEXT,
        time TEXT,
        type_fitt TEXT,
        volume TEXT,
        progression TEXT,
        sets INTEGER,
        reps INTEGER
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS criteria_weights (
        id SERIAL PRIMARY KEY,
        position TEXT NOT NULL,
        criteria_name TEXT NOT NULL,
        weight REAL NOT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS recommendation_rules (
        id SERIAL PRIMARY KEY,
        priority INTEGER NOT NULL,
        trigger_condition TEXT NOT NULL,
        recommendation_text TEXT NOT NULL,
        UNIQUE(trigger_condition, recommendation_text)
      );
    `);
    
    logger.info('✓ Database tables created');
    
    // Insert sample data
    await insertSampleData(client);
    
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function insertSampleData(client) {
  // Check if data already exists
  const teamCount = await client.query('SELECT COUNT(*) as count FROM teams');
  if (parseInt(teamCount.rows[0].count) > 0) {
    logger.info('✓ Sample data already exists');
    return;
  }
  
  // Insert team
  const teamResult = await client.query(
    'INSERT INTO teams (name) VALUES ($1) RETURNING id',
    ['Tim Utama']
  );
  const teamId = teamResult.rows[0].id;
  
  // Insert users
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  await client.query(
    `INSERT INTO users (name, email, password, role, team_id) 
     VALUES ($1, $2, $3, $4, $5)`,
    ['Dr. Budi', 'medis@test.com', hashedPassword, 'medis', teamId]
  );
  
  await client.query(
    `INSERT INTO users (name, email, password, role, team_id) 
     VALUES ($1, $2, $3, $4, $5)`,
    ['Coach Andi', 'pelatih@test.com', hashedPassword, 'pelatih', teamId]
  );
  
  // Insert sample athletes
  const athletes = [
    ['Rafi Ahmad', 'Striker', 'Prima', '2025-10-10'],
    ['Dimas Setiawan', 'Midfielder', 'Fit', '2025-10-09'],
    ['Yoga Pratama', 'Defender', 'Pemulihan', '2025-10-08'],
    ['Eko Saputra', 'Goalkeeper', 'Fit', '2025-10-10'],
  ];
  
  for (const athlete of athletes) {
    await client.query(
      `INSERT INTO athletes (team_id, name, position, status, last_assessment_date) 
       VALUES ($1, $2, $3, $4, $5)`,
      [teamId, ...athlete]
    );
  }
  
  // Insert sample exercises
  const exercises = [
    ['Sprint 100m', 'Cardio', 'Kecepatan', 'Latihan sprint jarak pendek'],
    ['Squat', 'Strength', 'Kekuatan Kaki', 'Latihan kekuatan otot kaki'],
    ['Plank', 'Core', 'Keseimbangan', 'Latihan stabilitas core'],
    ['Yoga Stretch', 'Flexibility', 'Fleksibilitas', 'Latihan peregangan'],
  ];
  
  for (const exercise of exercises) {
    await client.query(
      `INSERT INTO exercise_library (name, type, focus_area, description) 
       VALUES ($1, $2, $3, $4)`,
      exercise
    );
  }
  
  // Insert default criteria weights
  const positions = ['Striker', 'Midfielder', 'Defender', 'Goalkeeper'];
  const criteria = [
    ['Kecepatan', 0.25],
    ['Kekuatan', 0.2],
    ['Daya Tahan', 0.2],
    ['Fleksibilitas', 0.15],
    ['Keseimbangan', 0.1],
    ['Kelincahan', 0.1],
  ];
  
  for (const position of positions) {
    for (const [name, weight] of criteria) {
      await client.query(
        `INSERT INTO criteria_weights (position, criteria_name, weight) 
         VALUES ($1, $2, $3)`,
        [position, name, weight]
      );
    }
  }
  
  logger.info('✓ Sample data inserted');
  logger.info('\nDefault credentials:');
  logger.info('Medis - Email: medis@test.com, Password: password123');
  logger.info('Pelatih - Email: pelatih@test.com, Password: password123');
}

module.exports = { pool, testConnection, initializeDatabase };
