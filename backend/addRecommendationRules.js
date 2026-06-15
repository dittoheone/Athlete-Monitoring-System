require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Insert new Recommendation Rules
    console.log("Inserting Recommendation Rules...");
    
    // Rule 1: High Stress
    await client.query(`
      INSERT INTO recommendation_rules (priority, trigger_condition, recommendation_text)
      VALUES (1, '{"Stres": ">7"}', 'Perhatian: Tingkat stres tinggi. Disarankan untuk menjadwalkan sesi dengan psikolog tim atau memberikan cuti 1 hari.')
      ON CONFLICT DO NOTHING
    `);

    // Rule 2: Low sleep duration + low sprint speed
    await client.query(`
      INSERT INTO recommendation_rules (priority, trigger_condition, recommendation_text)
      VALUES (2, '{"Durasi Tidur": "<6", "Kecepatan (Sprint 30m) (detik)": ">4.5"}', 'Peringatan Fisik: Kurang tidur berdampak pada kecepatan sprint. Wajibkan sesi recovery aktif dan pantau jam tidur.')
      ON CONFLICT DO NOTHING
    `);

    // Rule 3: Low VO2 Max
    await client.query(`
      INSERT INTO recommendation_rules (priority, trigger_condition, recommendation_text)
      VALUES (3, '{"Daya Tahan (VO2 Max) (mL/kg/min)": "<45"}', 'Performa: VO2 Max di bawah standar. Tambahkan sesi aerobik intensitas sedang 2x seminggu.')
      ON CONFLICT DO NOTHING
    `);

    // Tweak an athlete to trigger Rule 1 & Rule 3
    // Find 'Budi Santoso'
    const athleteRes = await client.query("SELECT id FROM athletes WHERE name = 'Budi Santoso'");
    if (athleteRes.rows.length > 0) {
      const athleteId = athleteRes.rows[0].id;
      
      // Get his latest assessment
      const assessmentRes = await client.query("SELECT id FROM assessments WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1", [athleteId]);
      if (assessmentRes.rows.length > 0) {
        const assessmentId = assessmentRes.rows[0].id;

        // Tweak stress to 8
        await client.query("UPDATE assessment_metrics SET value = 8 WHERE assessment_id = $1 AND metric_name = 'Stres'", [assessmentId]);

        // Tweak VO2 Max to 42
        await client.query("UPDATE assessment_metrics SET value = 42 WHERE assessment_id = $1 AND metric_name = 'Daya Tahan (VO2 Max) (mL/kg/min)'", [assessmentId]);

        console.log("Tweaked Budi Santoso to trigger rules.");
      }
    }

    // Tweak an athlete to trigger Rule 2
    // Find 'Reza Pratama'
    const athleteRes2 = await client.query("SELECT id FROM athletes WHERE name = 'Reza Pratama'");
    if (athleteRes2.rows.length > 0) {
      const athleteId2 = athleteRes2.rows[0].id;
      
      const assessmentRes2 = await client.query("SELECT id FROM assessments WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1", [athleteId2]);
      if (assessmentRes2.rows.length > 0) {
        const assessmentId2 = assessmentRes2.rows[0].id;

        // Tweak sleep to 5
        await client.query("UPDATE assessment_metrics SET value = 5 WHERE assessment_id = $1 AND metric_name = 'Durasi Tidur'", [assessmentId2]);

        // Tweak sprint to 4.8
        await client.query("UPDATE assessment_metrics SET value = 4.8 WHERE assessment_id = $1 AND metric_name = 'Kecepatan (Sprint 30m) (detik)'", [assessmentId2]);

        console.log("Tweaked Reza Pratama to trigger rules.");
      }
    }

    console.log("Successfully created rules and tweaked athletes.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
