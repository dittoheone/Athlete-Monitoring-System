const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const db = new Database(path.join(__dirname, "../../database.db"));

// Enable foreign keys
db.pragma("foreign_keys = ON");

function initializeDatabase() {
  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('medis', 'pelatih')),
      team_id INTEGER NOT NULL,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS athletes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      position TEXT NOT NULL CHECK(position IN ('Striker', 'Midfielder', 'Defender', 'Goalkeeper')),
      status TEXT NOT NULL DEFAULT 'Fit' CHECK(status IN ('Prima', 'Fit', 'Pemulihan', 'Rehabilitasi')),
      last_assessment_date TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS assessments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      weight_kg REAL,
      notes TEXT,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS assessment_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id INTEGER NOT NULL,
      metric_category TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      value INTEGER NOT NULL,
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exercise_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      focus_area TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS training_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      athlete_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      frequency TEXT,
      intensity TEXT,
      time TEXT,
      type_fitt TEXT,
      volume TEXT,
      progression TEXT,
      sets INTEGER,
      reps INTEGER,
      FOREIGN KEY (athlete_id) REFERENCES athletes(id),
      FOREIGN KEY (exercise_id) REFERENCES exercise_library(id)
    );

    CREATE TABLE IF NOT EXISTS criteria_weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position TEXT NOT NULL,
      criteria_name TEXT NOT NULL,
      weight REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS recommendation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      priority INTEGER NOT NULL,
      trigger_condition TEXT NOT NULL,
      recommendation_text TEXT NOT NULL,
      UNIQUE(trigger_condition, recommendation_text)
    );
  `);

  console.log("✓ Database tables created");

  // Insert sample data
  insertSampleData();
}

function insertSampleData() {
  // Check if data already exists
  const teamCount = db.prepare("SELECT COUNT(*) as count FROM teams").get();
  if (teamCount.count > 0) {
    console.log("✓ Sample data already exists");
    return;
  }

  // Insert team
  const insertTeam = db.prepare("INSERT INTO teams (name) VALUES (?)");
  const teamResult = insertTeam.run("Tim Utama");
  const teamId = teamResult.lastInsertRowid;

  // Insert users
  const hashedPassword = bcrypt.hashSync("password123", 10);
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, team_id) 
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run("Dr. Budi", "medis@test.com", hashedPassword, "medis", teamId);
  insertUser.run(
    "Coach Andi",
    "pelatih@test.com",
    hashedPassword,
    "pelatih",
    teamId
  );

  // Insert sample athletes
  const insertAthlete = db.prepare(`
    INSERT INTO athletes (team_id, name, position, status, last_assessment_date) 
    VALUES (?, ?, ?, ?, ?)
  `);

  const athletes = [
    ["Rafi Ahmad", "Striker", "Prima", "2025-10-10"],
    ["Dimas Setiawan", "Midfielder", "Fit", "2025-10-09"],
    ["Yoga Pratama", "Defender", "Pemulihan", "2025-10-08"],
    ["Eko Saputra", "Goalkeeper", "Fit", "2025-10-10"],
  ];

  athletes.forEach((athlete) => {
    insertAthlete.run(teamId, ...athlete);
  });

  // Insert sample exercises
  const insertExercise = db.prepare(`
    INSERT INTO exercise_library (name, type, focus_area, description) 
    VALUES (?, ?, ?, ?)
  `);

  const exercises = [
    ["Sprint 100m", "Cardio", "Kecepatan", "Latihan sprint jarak pendek"],
    ["Squat", "Strength", "Kekuatan Kaki", "Latihan kekuatan otot kaki"],
    ["Plank", "Core", "Keseimbangan", "Latihan stabilitas core"],
    ["Yoga Stretch", "Flexibility", "Fleksibilitas", "Latihan peregangan"],
  ];

  exercises.forEach((exercise) => {
    insertExercise.run(...exercise);
  });

  // Insert default criteria weights
  const insertCriteria = db.prepare(`
    INSERT INTO criteria_weights (position, criteria_name, weight) 
    VALUES (?, ?, ?)
  `);

  const positions = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
  const criteria = [
    ["Kecepatan", 0.25],
    ["Kekuatan", 0.2],
    ["Daya Tahan", 0.2],
    ["Fleksibilitas", 0.15],
    ["Keseimbangan", 0.1],
    ["Kelincahan", 0.1],
  ];

  positions.forEach((position) => {
    criteria.forEach(([name, weight]) => {
      insertCriteria.run(position, name, weight);
    });
  });

  console.log("✓ Sample data inserted");
  console.log("\nDefault credentials:");
  console.log("Medis - Email: medis@test.com, Password: password123");
  console.log("Pelatih - Email: pelatih@test.com, Password: password123");
}

module.exports = { db, initializeDatabase };
