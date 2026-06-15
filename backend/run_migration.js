const { Pool } = require('pg');
const config = require('./src/utils/config');

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

const pool = new Pool(poolConfig);

async function migrate() {
  try {
    const client = await pool.connect();
    console.log("Starting migration...");

    // 1. Create user_teams
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, team_id)
      );
    `);
    console.log("Created user_teams table.");

    // 2. Migrate existing team_id data from users table if team_id still exists
    try {
      await client.query(`
        INSERT INTO user_teams (user_id, team_id)
        SELECT id, team_id FROM users WHERE team_id IS NOT NULL
        ON CONFLICT DO NOTHING;
      `);
      console.log("Migrated data from users.team_id to user_teams.");
    } catch (e) {
      console.log("Could not migrate team_id, column might not exist or error:", e.message);
    }

    // 3. Drop team_id from users table
    try {
      await client.query(`ALTER TABLE users DROP COLUMN team_id;`);
      console.log("Dropped team_id column from users.");
    } catch (e) {
      console.log("Could not drop team_id from users (already dropped?):", e.message);
    }

    // 4. Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assessments_athlete_date ON assessments(athlete_id, date DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assessment_metrics_lookup ON assessment_metrics(assessment_id, metric_name);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_athletes_team_status ON athletes(team_id, status);`);
    console.log("Created indexes.");

    // Create a new team and new users and assign them appropriately as requested by the user
    // Add another team
    const newTeamRes = await client.query(`
      INSERT INTO teams (name) VALUES ('Tim Elite Nusantara') 
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `);
    const newTeamId = newTeamRes.rows[0].id;

    // Get an existing team to assign multi-team
    const existingTeamRes = await client.query(`SELECT id FROM teams LIMIT 1;`);
    const existingTeamId = existingTeamRes.rows[0]?.id || newTeamId;

    // Generate hashed password for 'password123'
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create new coach
    const newCoachRes = await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Coach Multi', 'coach_multi@example.com', $1, 'pelatih')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [hashedPassword]);
    const newCoachId = newCoachRes.rows[0].id;

    // Create new medic
    const newMedicRes = await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Medic Multi', 'medic_multi@example.com', $1, 'medis')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [hashedPassword]);
    const newMedicId = newMedicRes.rows[0].id;

    // Assign to multi teams
    await client.query(`
      INSERT INTO user_teams (user_id, team_id) VALUES 
      ($1, $2), ($1, $3),
      ($4, $2), ($4, $3)
      ON CONFLICT DO NOTHING;
    `, [newCoachId, newTeamId, existingTeamId, newMedicId]);
    console.log("Created new team and assigned new coach/medic to multiple teams.");

    client.release();
    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
