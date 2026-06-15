require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get all athletes that are Cedera or Rehabilitasi
    const athletesRes = await client.query("SELECT id, name, status FROM athletes WHERE status IN ('Cedera', 'Rehabilitasi')");
    const athletes = athletesRes.rows;

    console.log(`Found ${athletes.length} athletes with Cedera/Rehabilitasi status.`);

    const injuryTypes = [
      'Cedera Hamstring', 
      'Ankle Sprain', 
      'Cedera ACL', 
      'Ketegangan Otot Betis', 
      'Cedera Bahu', 
      'Memar Paha'
    ];
    
    for (const athlete of athletes) {
      // Check if they already have an injury record
      const existingRes = await client.query("SELECT id FROM injury_records WHERE athlete_id = $1", [athlete.id]);
      
      if (existingRes.rows.length === 0) {
        const type = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
        const severity = athlete.status === 'Cedera' ? 'Tinggi' : 'Sedang';
        const recovery = athlete.status === 'Cedera' ? '4-8 Minggu' : '1-2 Minggu';
        const status = athlete.status === 'Cedera' ? 'Aktif' : 'Pemulihan';
        const notes = athlete.status === 'Cedera' 
          ? `Atlet mengalami ${type} saat sesi latihan. Membutuhkan observasi ketat.` 
          : `Sedang dalam masa transisi kembali ke lapangan setelah ${type}.`;
          
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 14)); // Random date within last 2 weeks

        await client.query(
          "INSERT INTO injury_records (athlete_id, injury_type, severity_level, status, estimated_recovery, notes, date) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [athlete.id, type, severity, status, recovery, notes, date]
        );
        console.log(`Added injury record for ${athlete.name} (${athlete.status})`);
      }
    }

    await client.query('COMMIT');
    console.log('Injury records backfill completed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error generating data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
