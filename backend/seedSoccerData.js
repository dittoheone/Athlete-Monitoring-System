require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const players = [
  ['Agus Santoso', 'Goalkeeper', 'Fit', '1998-03-15'],
  ['Bima Arya', 'Goalkeeper', 'Prima', '2001-07-22'],
  ['Hendra Wijaya', 'Defender', 'Fit', '1997-11-05'],
  ['Reza Pratama', 'Defender', 'Underperform', '2000-09-12'],
  ['Doni Saputra', 'Defender', 'Prima', '1999-04-30'],
  ['Gilang Ramadhan', 'Defender', 'Fit', '2002-01-18'],
  ['Fajar Sidik', 'Defender', 'Rehabilitasi', '1998-08-25'],
  ['Kevin Sanjaya', 'Defender', 'Fit', '2001-12-10'],
  ['Andik Vermansyah', 'Midfielder', 'Prima', '1996-05-14'],
  ['Evan Dimas', 'Midfielder', 'Fit', '1995-03-13'],
  ['Egy Maulana', 'Midfielder', 'Fit', '2000-07-07'],
  ['Witan Sulaeman', 'Midfielder', 'Prima', '2001-10-08'],
  ['Syahrian Abimanyu', 'Midfielder', 'Cedera', '1999-04-25'],
  ['Ricky Kambuaya', 'Midfielder', 'Fit', '1996-05-05'],
  ['Ilija Spasojevic', 'Striker', 'Fit', '1987-09-11'],
  ['Saddil Ramdani', 'Striker', 'Prima', '1999-01-02'],
  ['Ramadhan Sananta', 'Striker', 'Fit', '2002-11-27'],
  ['Hokky Caraka', 'Striker', 'Fit', '2004-08-21']
];

const matchesData = [
  { opp: 'Persija Jakarta', date: '2026-05-01', venue: 'Gelora Bung Karno', comp: 'Liga 1', status: 'Selesai', score: '2-1' },
  { opp: 'Persib Bandung', date: '2026-05-08', venue: 'Gelora Bandung Lautan Api', comp: 'Liga 1', status: 'Selesai', score: '1-1' },
  { opp: 'Persebaya', date: '2026-05-15', venue: 'Gelora Bung Tomo', comp: 'Liga 1', status: 'Selesai', score: '3-0' },
  { opp: 'Arema FC', date: '2026-05-22', venue: 'Kanjuruhan', comp: 'Liga 1', status: 'Selesai', score: '0-2' },
  { opp: 'Bali United', date: '2026-05-29', venue: 'Kapten I Wayan Dipta', comp: 'Liga 1', status: 'Selesai', score: '2-2' }
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Seeding data...');
    
    const res = await client.query('SELECT id FROM teams LIMIT 1');
    const teamId = res.rows[0].id;
    
    const userRes = await client.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['medis']);
    const medisId = userRes.rows[0]?.id || 1;

    // 1. Insert Players
    const newAthletes = [];
    for (const p of players) {
      const result = await client.query(
        `INSERT INTO athletes (team_id, name, position, status, date_of_birth, last_assessment_date) 
         VALUES ($1, $2, $3, $4, $5, CURRENT_DATE) RETURNING id`,
        [teamId, p[0], p[1], p[2], p[3]]
      );
      newAthletes.push(result.rows[0].id);
    }
    console.log(`Inserted ${newAthletes.length} new players.`);

    // 2. Fetch all athletes to assign assessments and match stats
    const allAthletesRes = await client.query('SELECT id, position FROM athletes WHERE team_id = $1', [teamId]);
    const allAthletes = allAthletesRes.rows;

    // 3. Insert Assessments (Past 3 months)
    let assessmentCount = 0;
    const dates = ['2026-04-10', '2026-05-10', '2026-06-10'];
    
    for (const ath of allAthletes) {
      let baseV = 60 + Math.random() * 20; // 60-80
      for (const d of dates) {
        baseV += (Math.random() * 10 - 3); // random progression
        if(baseV > 100) baseV = 100;
        
        const aRes = await client.query(
          `INSERT INTO assessments (athlete_id, user_id, date, notes) VALUES ($1, $2, $3, 'Rutin bulanan') RETURNING id`,
          [ath.id, medisId, d]
        );
        const aId = aRes.rows[0].id;
        
        const physicalMetrics = [
          ['Kecepatan (Sprint 30m) (Detik)', Math.round(4 + Math.random() * 2)],
          ['Kekuatan (1RM Squat) (Kg)', Math.round(80 + Math.random() * 40)],
          ['Daya Tahan (VO2 Max) (mL/kg/min)', Math.round(45 + Math.random() * 15)],
          ['Kelincahan (Agility) (Detik)', Math.round(4 + Math.random() * 2)],
          ['Keseimbangan (Balance) (Skor)', Math.round(5 + Math.random() * 5)]
        ];

        for (const m of physicalMetrics) {
          await client.query(
            `INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, 'Pemeriksaan Fisik', $2, $3)`,
            [aId, m[0], m[1]]
          );
        }

        const mentalMetrics = [
          ['Skor Stres (1-10)', Math.round(1 + Math.random() * 5)],
          ['Mood (1-10)', Math.round(5 + Math.random() * 5)],
        ];
        for (const m of mentalMetrics) {
          await client.query(
            `INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, 'Kesehatan Mental', $2, $3)`,
            [aId, m[0], m[1]]
          );
        }

        const sleepMetrics = [
          ['Durasi Tidur (Jam)', Math.round(6 + Math.random() * 3)],
          ['Kualitas', Math.round(5 + Math.random() * 5)],
        ];
        for (const m of sleepMetrics) {
          await client.query(
            `INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, 'Kualitas Tidur', $2, $3)`,
            [aId, m[0], m[1]]
          );
        }
        assessmentCount++;
      }
    }
    console.log(`Inserted ${assessmentCount} assessments.`);

    // 4. Insert Matches & Stats
    let matchCount = 0;
    for (const m of matchesData) {
      const mRes = await client.query(
        `INSERT INTO matches (team_id, opponent_name, match_date, venue, competition, result_status, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [teamId, m.opp, m.date, m.venue, m.comp, m.status, m.score]
      );
      const matchId = mRes.rows[0].id;
      matchCount++;

      // Pick 14 random players to play this match
      const shuffled = allAthletes.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 14);

      for (const ath of selected) {
        const mins = ath.position === 'Goalkeeper' ? 90 : Math.round(45 + Math.random() * 45);
        const isAttacker = ath.position === 'Striker' || ath.position === 'Midfielder';
        const goals = isAttacker && Math.random() > 0.8 ? 1 : 0;
        const assists = isAttacker && Math.random() > 0.8 ? 1 : 0;
        const yc = Math.random() > 0.8 ? 1 : 0;
        const rc = Math.random() > 0.98 ? 1 : 0;
        const rating = (6.0 + Math.random() * 3.5).toFixed(1);

        await client.query(
          `INSERT INTO match_statistics (match_id, athlete_id, minutes_played, goals, assists, yellow_cards, red_cards, rating)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [matchId, ath.id, mins, goals, assists, yc, rc, rating]
        );
      }
    }
    console.log(`Inserted ${matchCount} matches with stats.`);

    // 5. Insert Team Schedules
    const futureDate = new Date();
    const schedules = [
      { date: new Date(futureDate.getTime() + 1 * 24*60*60*1000), title: "Tactical & Fitness", target: "All Players", sessionType: "Pagi", timeRange: "08:00 - 10:00" },
      { date: new Date(futureDate.getTime() + 2 * 24*60*60*1000), title: "Recovery Session", target: "Starting XI", sessionType: "Sore", timeRange: "16:00 - 17:30" },
      { date: new Date(futureDate.getTime() + 3 * 24*60*60*1000), title: "Set Piece Practice", target: "All Players", sessionType: "Pagi", timeRange: "08:00 - 10:00" },
      { date: new Date(futureDate.getTime() + 4 * 24*60*60*1000), title: "Match vs Persija", target: "Match Squad", sessionType: "Sore", timeRange: "15:30 - 18:00" },
    ];
    
    for (const sch of schedules) {
      await client.query(`
        INSERT INTO team_schedules (team_id, date, title, target, session_type, time_range)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [teamId, sch.date, sch.title, sch.target, sch.sessionType, sch.timeRange]);
    }
    console.log(`Inserted ${schedules.length} schedules.`);

    await client.query('COMMIT');
    console.log('Dummy data successfully inserted!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
