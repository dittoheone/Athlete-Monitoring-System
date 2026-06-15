require('dotenv').config();
const { getTeamOverview } = require('./src/database/queries');
const { pool } = require('./src/database/init');

getTeamOverview(1).then(data => {
  const sum = data.reduce((s, a) => s + (a.tidurDurasi || 0), 0);
  console.log('avg:', sum / data.length);
  console.log('durations:', data.map(d => d.tidurDurasi));
  
  const positions = ['Striker', 'Midfielder', 'Defender', 'Goalkeeper'];
  const positionData = positions.map(pos => {
    const posAthletes = data.filter(a => a.position === pos);
    const result = { position: pos, Prima: 0, Fit: 0, Underperform: 0, Pemulihan: 0, Rehabilitasi: 0, Cedera: 0 };
    posAthletes.forEach(a => {
      if (result[a.status] !== undefined) result[a.status]++;
    });
    return result;
  });
  console.log('positionData:', positionData);
}).catch(console.error).finally(() => pool.end());
