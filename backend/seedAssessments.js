require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const generateDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const storylines = [
  {
    status: 'Underperform',
    trend: 'deteriorating', // Gets worse over time, triggers alerts
    assessments: [
      { 
        daysAgo: 60,
        fisik: { speed: 4.2, squat: 110, vo2: 50, agility: 15.5, balance: 90, inbody: 80, fat: 12 },
        mental: { sleep: 7.5, sleepQ: 8, motivation: 8, focus: 8, confidence: 7 }
      },
      { 
        daysAgo: 30,
        fisik: { speed: 4.5, squat: 105, vo2: 46, agility: 16.0, balance: 82, inbody: 75, fat: 14 },
        mental: { sleep: 6.5, sleepQ: 6, motivation: 6, focus: 5, confidence: 6 }
      },
      { 
        daysAgo: 5,
        fisik: { speed: 4.8, squat: 100, vo2: 42, agility: 16.5, balance: 75, inbody: 70, fat: 16 }, // Alert: vo2 < 45, balance < 80
        mental: { sleep: 5.5, sleepQ: 5, motivation: 5, focus: 4, confidence: 5 } // Alert: sleep < 7
      }
    ]
  },
  {
    status: 'Prima',
    trend: 'improving', // Steady improvement
    assessments: [
      { 
        daysAgo: 60,
        fisik: { speed: 4.1, squat: 120, vo2: 55, agility: 15.0, balance: 95, inbody: 85, fat: 10 },
        mental: { sleep: 8, sleepQ: 8, motivation: 8, focus: 8, confidence: 8 }
      },
      { 
        daysAgo: 30,
        fisik: { speed: 4.0, squat: 125, vo2: 58, agility: 14.8, balance: 98, inbody: 88, fat: 9 },
        mental: { sleep: 8.5, sleepQ: 9, motivation: 9, focus: 9, confidence: 9 }
      },
      { 
        daysAgo: 2,
        fisik: { speed: 3.9, squat: 130, vo2: 62, agility: 14.5, balance: 102, inbody: 92, fat: 8 },
        mental: { sleep: 8.5, sleepQ: 9, motivation: 10, focus: 10, confidence: 10 }
      }
    ]
  },
  {
    status: 'Cedera',
    trend: 'crash', // Huge drop in latest assessment
    assessments: [
      { 
        daysAgo: 60,
        fisik: { speed: 4.0, squat: 125, vo2: 58, agility: 15.0, balance: 95, inbody: 85, fat: 10 },
        mental: { sleep: 8, sleepQ: 8, motivation: 9, focus: 8, confidence: 9 }
      },
      { 
        daysAgo: 10,
        fisik: { speed: 5.5, squat: 80, vo2: 40, agility: 18.0, balance: 60, inbody: 75, fat: 12 }, // Post-injury crash
        mental: { sleep: 5, sleepQ: 4, motivation: 4, focus: 5, confidence: 3 }
      }
    ]
  },
  {
    status: 'Rehabilitasi',
    trend: 'recovering', // Was crashed, now recovering slightly
    assessments: [
      { 
        daysAgo: 60,
        fisik: { speed: 5.8, squat: 70, vo2: 38, agility: 18.5, balance: 55, inbody: 70, fat: 14 },
        mental: { sleep: 6, sleepQ: 5, motivation: 5, focus: 5, confidence: 4 }
      },
      { 
        daysAgo: 30,
        fisik: { speed: 5.2, squat: 85, vo2: 42, agility: 17.5, balance: 70, inbody: 74, fat: 13 },
        mental: { sleep: 7, sleepQ: 6, motivation: 7, focus: 6, confidence: 6 }
      },
      { 
        daysAgo: 3,
        fisik: { speed: 4.8, squat: 95, vo2: 46, agility: 16.5, balance: 82, inbody: 78, fat: 12 },
        mental: { sleep: 7.5, sleepQ: 7, motivation: 8, focus: 8, confidence: 7 }
      }
    ]
  },
  {
    status: 'Fit',
    trend: 'consistent', // Solid consistent numbers
    assessments: [
      { 
        daysAgo: 60,
        fisik: { speed: 4.2, squat: 110, vo2: 52, agility: 15.5, balance: 90, inbody: 82, fat: 11 },
        mental: { sleep: 7.5, sleepQ: 8, motivation: 8, focus: 8, confidence: 8 }
      },
      { 
        daysAgo: 30,
        fisik: { speed: 4.2, squat: 112, vo2: 53, agility: 15.4, balance: 92, inbody: 83, fat: 11 },
        mental: { sleep: 7.5, sleepQ: 8, motivation: 8, focus: 8, confidence: 8 }
      },
      { 
        daysAgo: 1,
        fisik: { speed: 4.1, squat: 115, vo2: 54, agility: 15.2, balance: 92, inbody: 84, fat: 10 },
        mental: { sleep: 8, sleepQ: 8, motivation: 9, focus: 8, confidence: 8 }
      }
    ]
  }
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all athletes
    const athletesRes = await client.query('SELECT id, name FROM athletes');
    const athletes = athletesRes.rows;

    const userRes = await client.query("SELECT id FROM users WHERE role = 'medis' LIMIT 1");
    const userId = userRes.rows.length > 0 ? userRes.rows[0].id : 1;

    if (athletes.length === 0) {
      console.log("No athletes found!");
      return;
    }

    console.log(`Found ${athletes.length} athletes. Clearing old assessments...`);
    
    // Clear all existing assessments (cascades or delete manually)
    await client.query('DELETE FROM assessment_metrics');
    await client.query('DELETE FROM assessments');

    let i = 0;
    for (const athlete of athletes) {
      const story = storylines[i % storylines.length];
      console.log(`Processing Athlete ${athlete.name} -> Story: ${story.status} (${story.trend})`);

      // Update athlete status
      await client.query('UPDATE athletes SET status = $1 WHERE id = $2', [story.status, athlete.id]);

      for (const a of story.assessments) {
        const assessmentDate = generateDate(a.daysAgo);
        
        // Insert Assessment
        const asmtRes = await client.query(
          'INSERT INTO assessments (athlete_id, user_id, date) VALUES ($1, $2, $3) RETURNING id',
          [athlete.id, userId, assessmentDate]
        );
        const asmtId = asmtRes.rows[0].id;

        // Insert Fisik & BIA
        const fisikMetrics = [
          ['Kecepatan (Sprint 30m) (Detik)', a.fisik.speed],
          ['Kekuatan (1RM Squat) (Kg)', a.fisik.squat],
          ['Daya Tahan (VO2 Max) (mL/kg/min)', a.fisik.vo2],
          ['Kelincahan (Illinois) (Detik)', a.fisik.agility],
          ['Keseimbangan (Y-Balance) (Cm)', a.fisik.balance],
          ['InBody Score (0-100)', a.fisik.inbody],
          ['Body Fat % (Opsional)', a.fisik.fat]
        ];

        for (const m of fisikMetrics) {
          await client.query(
            'INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)',
            [asmtId, 'Fisik & BIA', m[0], m[1]]
          );
        }

        // Insert Mental & Tidur
        const mentalMetrics = [
          ['Durasi Tidur (Jam)', a.mental.sleep],
          ['Kualitas Tidur (1-10)', a.mental.sleepQ],
          ['Motivasi (1-10)', a.mental.motivation],
          ['Fokus (1-10)', a.mental.focus],
          ['Kepercayaan Diri (1-10)', a.mental.confidence]
        ];

        for (const m of mentalMetrics) {
          await client.query(
            'INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value) VALUES ($1, $2, $3, $4)',
            [asmtId, 'Mental & Tidur', m[0], m[1]]
          );
        }
      }
      i++;
    }

    await client.query('COMMIT');
    console.log('Dummy data generation completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
