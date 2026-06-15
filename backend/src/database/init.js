const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const config = require('../utils/config');
const logger = require('../utils/logger');

// Create connection pool
const poolConfig = config.DATABASE_URL
  ? { 
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: config.DB_HOST,
      port: config.DB_PORT,
      database: config.DB_NAME,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
    };

const pool = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
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
        name TEXT NOT NULL UNIQUE,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('medis', 'pelatih', 'admin')),
        requires_password_change BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, team_id)
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS athletes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position TEXT NOT NULL CHECK(position IN ('Striker', 'Midfielder', 'Defender', 'Goalkeeper')),
        status TEXT NOT NULL DEFAULT 'Fit' CHECK(status IN ('Prima', 'Fit', 'Underperform', 'Cedera', 'Rehabilitasi')),
        last_assessment_date DATE,
        date_of_birth DATE,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL,
        UNIQUE (name, team_id)
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
        description TEXT,
        mapped_metric TEXT,
        frequency TEXT,
        intensity TEXT,
        time_duration TEXT,
        type_fitt TEXT,
        sets INTEGER,
        reps INTEGER,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
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
        reps INTEGER,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS injury_records (
        id SERIAL PRIMARY KEY,
        athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        injury_type TEXT NOT NULL,
        severity_level TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Aktif',
        estimated_recovery TEXT,
        notes TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        opponent_name TEXT NOT NULL,
        match_date DATE NOT NULL,
        venue TEXT,
        competition TEXT,
        result_status TEXT,
        score TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS match_statistics (
        id SERIAL PRIMARY KEY,
        match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        athlete_id INTEGER NOT NULL REFERENCES athletes(id) ON DELETE CASCADE,
        minutes_played INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        rating REAL,
        UNIQUE(match_id, athlete_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team_standards (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        position TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        standard_value REAL NOT NULL,
        UNIQUE(team_id, position, metric_name)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS team_settings (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
        threshold_prima REAL NOT NULL DEFAULT 85,
        threshold_underperform REAL NOT NULL DEFAULT 70,
        weight_fisik REAL NOT NULL DEFAULT 0.40,
        weight_bia REAL NOT NULL DEFAULT 0.25,
        weight_mental REAL NOT NULL DEFAULT 0.20,
        weight_tidur REAL NOT NULL DEFAULT 0.15,
        deleted_at TIMESTAMP DEFAULT NULL,
        deleted_by INTEGER DEFAULT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_schedules (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        date TIMESTAMP NOT NULL,
        title TEXT NOT NULL,
        target TEXT NOT NULL,
        session_type TEXT NOT NULL,
        time_range TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_type TEXT NOT NULL CHECK(ticket_type IN ('password_reset', 'account_creation')),
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'resolved')),
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP DEFAULT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        ip_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
  
  await client.query(
    `INSERT INTO users (name, email, password, role, team_id) 
     VALUES ($1, $2, $3, $4, $5)`,
    ['Admin Super', 'admin@test.com', hashedPassword, 'admin', null]
  );
  
  // Insert sample athletes
  const athletes = [
    ['Rafi Ahmad', 'Striker', 'Prima', '2025-10-10', '2000-01-01'],
    ['Dimas Setiawan', 'Midfielder', 'Fit', '2025-10-09', '2001-02-02'],
    ['Yoga Pratama', 'Defender', 'Fit', '2025-10-08', '2000-05-05'],
    ['Eko Saputra', 'Goalkeeper', 'Fit', '2025-10-10', '1999-12-12'],
  ];
  
  for (const athlete of athletes) {
    await client.query(
      `INSERT INTO athletes (team_id, name, position, status, last_assessment_date, date_of_birth) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
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

  // Insert default team settings
  await client.query(`
    INSERT INTO team_settings (team_id, threshold_prima, threshold_underperform)
    VALUES ($1, 85, 70)
  `, [teamId]);

  // Insert default team standards (example)
  const defaultStandards = [
    ['Striker', 'Kecepatan (Sprint 30m) (detik)', 4.0],
    ['Striker', 'Kekuatan (1RM Squat) (kg)', 120],
    ['Striker', 'Daya Tahan (VO2 Max) (mL/kg/min)', 55],
    ['Striker', 'Kelincahan (Illinois) (detik)', 16.5],
    ['Striker', 'Keseimbangan (Y-Balance) (cm)', 90],
  ];

  for (const std of defaultStandards) {
    await client.query(`
      INSERT INTO team_standards (team_id, position, metric_name, standard_value)
      VALUES ($1, $2, $3, $4)
    `, [teamId, ...std]);
  }
  
  logger.info('✓ Sample data inserted');
  logger.info('\nDefault credentials:');
  logger.info('Admin - Email: admin@test.com, Password: password123');
  logger.info('Medis - Email: medis@test.com, Password: password123');
  logger.info('Pelatih - Email: pelatih@test.com, Password: password123');
}

module.exports = { pool, testConnection, initializeDatabase };
