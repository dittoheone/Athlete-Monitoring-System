const { pool } = require("./init");

// Athlete queries
const getAthleteById = async (athleteId, teamId) => {
  const result = await pool.query(
    `
      SELECT a.*, t.name as team_name
      FROM athletes a
      JOIN teams t ON a.team_id = t.id
      WHERE a.id = $1 AND a.team_id = $2 AND a.deleted_at IS NULL
    `,
    [athleteId, teamId]
  );
  return result.rows[0];
};

const getAthletesByTeam = async (teamId) => {
  const result = await pool.query(
    `
      SELECT * FROM athletes 
      WHERE team_id = $1 AND deleted_at IS NULL
      ORDER BY name
    `,
    [teamId]
  );
  return result.rows;
};

const createAthlete = async (teamId, name, position) => {
  const result = await pool.query(
    `
      INSERT INTO athletes (team_id, name, position, status) 
      VALUES ($1, $2, $3, 'Fit')
      RETURNING id
    `,
    [teamId, name, position]
  );
  return result.rows[0];
};

const updateAthlete = async (athleteId, updates) => {
  const updateFields = Object.keys(updates);
  if (updateFields.length === 0) return null;

  const setClause = updateFields.map((field, i) => `${field} = $${i + 1}`).join(", ");
  const values = [...updateFields.map((field) => updates[field]), athleteId];

  const result = await pool.query(`UPDATE athletes SET ${setClause} WHERE id = $${values.length}`, values);
  return result;
};

const deleteAthlete = async (athleteId, teamId, userId) => {
  const result = await pool.query("UPDATE athletes SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND team_id = $3", [userId, athleteId, teamId]);
  return result;
};

// Assessment queries
const getAssessmentsByAthlete = async (athleteId, teamId) => {
  const assessmentsResult = await pool.query(
    `
      SELECT a.*, u.name as assessor_name
      FROM assessments a
      JOIN users u ON a.user_id = u.id
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
    `,
    [athleteId, teamId]
  );

  const assessments = assessmentsResult.rows;

  for (let i = 0; i < assessments.length; i++) {
    const metricsResult = await pool.query(
      `
        SELECT metric_category, metric_name, value
        FROM assessment_metrics
        WHERE assessment_id = $1
      `,
      [assessments[i].id]
    );
    assessments[i].metrics = metricsResult.rows;
  }

  return assessments;
};

const getAssessmentById = async (assessmentId, teamId) => {
  const assessmentResult = await pool.query(
    `
      SELECT a.*, u.name as assessor_name, ath.name as athlete_name
      FROM assessments a
      JOIN users u ON a.user_id = u.id
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.id = $1 AND ath.team_id = $2
    `,
    [assessmentId, teamId]
  );

  const assessment = assessmentResult.rows[0];
  if (!assessment) return null;

  const metricsResult = await pool.query(
    `
      SELECT metric_category, metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1
    `,
    [assessmentId]
  );
  
  assessment.metrics = metricsResult.rows;
  return assessment;
};

const createAssessment = async (athleteId, userId, date, weight, notes, metrics) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const insertAssessmentResult = await client.query(`
      INSERT INTO assessments (athlete_id, user_id, date, weight_kg, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [athleteId, userId, date, weight || null, notes || null]);
    
    const assessmentId = insertAssessmentResult.rows[0].id;

    for (const [category, categoryMetrics] of Object.entries(metrics)) {
      for (const [metricName, value] of Object.entries(categoryMetrics)) {
        await client.query(`
          INSERT INTO assessment_metrics (assessment_id, metric_category, metric_name, value)
          VALUES ($1, $2, $3, $4)
        `, [assessmentId, category, metricName, value]);
      }
    }

    const { status } = await calculateAthleteStatus(athleteId, client);
    await client.query(`
      UPDATE athletes 
      SET last_assessment_date = $1, status = $2
      WHERE id = $3
    `, [date, status, athleteId]);

    await client.query('COMMIT');
    return assessmentId;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

// Exercise queries
const getExercises = async () => {
  const result = await pool.query("SELECT * FROM exercise_library ORDER BY name");
  return result.rows;
};

const createExercise = async (name, type, focusArea, description) => {
  const result = await pool.query(
    `
      INSERT INTO exercise_library (name, type, focus_area, description)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [name, type, focusArea, description || null]
  );
  return result.rows[0];
};

const getTrainingProgramsByAthlete = async (athleteId, teamId) => {
  const result = await pool.query(
    `
      SELECT 
        tp.*,
        el.name as exercise_name,
        el.type as exercise_type,
        el.focus_area
      FROM training_programs tp
      JOIN exercise_library el ON tp.exercise_id = el.id
      JOIN athletes a ON tp.athlete_id = a.id
      WHERE tp.athlete_id = $1 AND a.team_id = $2
    `,
    [athleteId, teamId]
  );
  return result.rows;
};

const createTrainingProgram = async (athleteId, exerciseId, programData) => {
  const {
    frequency,
    intensity,
    time,
    typeFitt,
    volume,
    progression,
    sets,
    reps,
  } = programData;
  const result = await pool.query(
    `
      INSERT INTO training_programs 
      (athlete_id, exercise_id, frequency, intensity, time, type_fitt, volume, progression, sets, reps)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
    [
      athleteId,
      exerciseId,
      frequency,
      intensity,
      time,
      typeFitt,
      volume,
      progression,
      sets,
      reps
    ]
  );
  return result.rows[0].id;
};

// Team queries
const getTeamById = async (teamId) => {
  const result = await pool.query("SELECT * FROM teams WHERE id = $1", [teamId]);
  return result.rows[0];
};

const getTeamMembers = async (teamId) => {
  const result = await pool.query(
    `
      SELECT id, name, email, role 
      FROM users 
      WHERE team_id = $1
    `,
    [teamId]
  );
  return result.rows;
};

const getTeamAthleteCount = async (teamId) => {
  const result = await pool.query(
    `
      SELECT COUNT(*) as count 
      FROM athletes 
      WHERE team_id = $1
    `,
    [teamId]
  );
  return result.rows[0];
};

// Dashboard queries
const getAthletePerformanceData = async (
  athleteId,
  teamId,
  category = null,
  metric = null
) => {
  let query = `
    SELECT 
      a.date,
      am.metric_category,
      am.metric_name,
      am.value
    FROM assessments a
    JOIN assessment_metrics am ON a.id = am.assessment_id
    WHERE a.athlete_id = $1
  `;
  const params = [athleteId];
  let paramCount = 2;

  if (category) {
    query += ` AND am.metric_category = $${paramCount++}`;
    params.push(category);
  }
  if (metric) {
    query += ` AND am.metric_name = $${paramCount++}`;
    params.push(metric);
  }
  query += " ORDER BY a.date ASC";

  const result = await pool.query(query, params);
  return result.rows;
};

const getLatestPhysicalAssessment = async (athleteId, teamId) => {
  const latestResult = await pool.query(
    `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
    [athleteId, teamId]
  );
  
  const latestAssessment = latestResult.rows[0];
  if (!latestAssessment) return null;

  const metricsResult = await pool.query(
    `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Fisik & BIA'
    `,
    [latestAssessment.id]
  );

  return { latestAssessment, metrics: metricsResult.rows };
};

const getLatestMentalAssessment = async (athleteId, teamId) => {
  const latestResult = await pool.query(
    `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
    [athleteId, teamId]
  );
  
  const latestAssessment = latestResult.rows[0];
  if (!latestAssessment) return null;

  const metricsResult = await pool.query(
    `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Mental & Tidur'
    `,
    [latestAssessment.id]
  );
  
  // Filter out sleep metrics
  const metrics = metricsResult.rows.filter(m => 
    !m.metric_name.toLowerCase().includes('tidur') && 
    !m.metric_name.toLowerCase().includes('sleep')
  );

  return { latestAssessment, metrics };
};

const getLatestSleepAssessment = async (athleteId, teamId) => {
  const latestResult = await pool.query(
    `
      SELECT a.id, a.date
      FROM assessments a
      JOIN athletes ath ON a.athlete_id = ath.id
      WHERE a.athlete_id = $1 AND ath.team_id = $2
      ORDER BY a.date DESC
      LIMIT 1
    `,
    [athleteId, teamId]
  );
  
  const latestAssessment = latestResult.rows[0];
  if (!latestAssessment) return null;

  const metricsResult = await pool.query(
    `
      SELECT metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1 AND metric_category = 'Mental & Tidur'
    `,
    [latestAssessment.id]
  );
  
  // Filter only sleep metrics
  const metrics = metricsResult.rows.filter(m => 
    m.metric_name.toLowerCase().includes('tidur') || 
    m.metric_name.toLowerCase().includes('sleep')
  );

  return { latestAssessment, metrics };
};

const getTeamOverview = async (teamId) => {
  const result = await pool.query(
    `
      SELECT 
        id, name, position, status, last_assessment_date
      FROM athletes
      WHERE team_id = $1
      ORDER BY name
    `,
    [teamId]
  );
  
  const athletes = result.rows;
  for (let i = 0; i < athletes.length; i++) {
    const { spkScore, fisikScore, mentalScore, tidurDurasi } = await calculateAthleteStatus(athletes[i].id, pool);
    athletes[i].spkScore = parseFloat((spkScore || 0).toFixed(1));
    athletes[i].fisikScore = parseFloat((fisikScore || 0).toFixed(1));
    athletes[i].mentalScore = parseFloat((mentalScore || 0).toFixed(1));
    athletes[i].tidurDurasi = parseFloat((tidurDurasi || 0).toFixed(1));
  }
  
  return athletes;
};

// Helper functions
async function calculateAthleteStatus(athleteId, client) {
  // 1. Logika Cedera Override
  const injuryRes = await client.query(
    "SELECT id FROM injury_records WHERE athlete_id = $1 AND status = 'Aktif' LIMIT 1", 
    [athleteId]
  );
  if (injuryRes.rows.length > 0) return { status: 'Cedera', spkScore: 0 };

  // 2. Fetch Athlete Data, Team Settings, and Standards
  const athRes = await client.query("SELECT team_id, position FROM athletes WHERE id = $1", [athleteId]);
  if (athRes.rows.length === 0) return { status: 'Fit', spkScore: 0 };
  const { team_id: teamId, position } = athRes.rows[0];

  const settingsRes = await client.query("SELECT * FROM team_settings WHERE team_id = $1", [teamId]);
  const settings = settingsRes.rows[0] || {
    threshold_prima: 85, threshold_underperform: 70,
    weight_fisik: 0.40, weight_bia: 0.25, weight_mental: 0.20, weight_tidur: 0.15
  };

  const stdRes = await client.query("SELECT metric_name, standard_value FROM team_standards WHERE team_id = $1 AND position = $2", [teamId, position]);
  const standards = {};
  stdRes.rows.forEach(r => standards[r.metric_name] = r.standard_value);

  // 3. Fetch latest metrics for this athlete
  const latestAssRes = await client.query(
    "SELECT id FROM assessments WHERE athlete_id = $1 ORDER BY date DESC LIMIT 1", 
    [athleteId]
  );
  if (latestAssRes.rows.length === 0) return { status: 'Fit', spkScore: 0 };
  const assessmentId = latestAssRes.rows[0].id;

  const metricsRes = await client.query(
    "SELECT metric_category, metric_name, value FROM assessment_metrics WHERE assessment_id = $1", 
    [assessmentId]
  );
  
  const physical = {};
  const mental = {};
  const tidur = {};
  let inbodyScore = 0;
  
  metricsRes.rows.forEach(m => {
    const val = parseFloat(m.value) || 0;
    const cat = m.metric_category.toLowerCase();
    const name = m.metric_name.toLowerCase();
    
    if (cat.includes('fisik') || cat.includes('physical')) {
      physical[m.metric_name] = val;
    } else if (cat.includes('mental') || cat.includes('tidur') || cat.includes('sleep')) {
      if (name.includes('tidur') || name.includes('sleep')) {
        tidur[name] = val;
      } else {
        mental[name] = val;
      }
    }
    
    if (cat.includes('bia') || name.includes('inbody') || name.includes('body fat')) {
      if (name.includes('inbody')) inbodyScore = val;
    }
  });

  // Fisik (SAW)
  let s_fisik_total = 0;
  let fisik_count = 0;
  for (const [metric, val] of Object.entries(physical)) {
    const ideal = parseFloat(standards[metric]) || val || 1; // fallback to 1 to avoid DivisionByZero
    if (metric.toLowerCase().includes('sprint') || metric.toLowerCase().includes('illinois')) {
      s_fisik_total += Math.min(100, (ideal / (val || 1)) * 100);
    } else {
      s_fisik_total += Math.min(100, (val / ideal) * 100);
    }
    fisik_count++;
  }
  const s_fisik = fisik_count > 0 ? s_fisik_total / fisik_count : 0;

  // BIA
  const s_bia = inbodyScore;

  // Tidur
  const durasiKey = Object.keys(tidur).find(k => k.includes('durasi')) || "durasi tidur";
  const kualitasKey = Object.keys(tidur).find(k => k.includes('kualitas')) || "kualitas tidur";
  const durasi = tidur[durasiKey] || 0;
  const kualitas = tidur[kualitasKey] || 0;
  const s_durasi = Math.min(100, (durasi / 8) * 100);
  const s_kualitas = kualitas * 10;
  const s_tidur = ((s_durasi + s_kualitas) / 2) || 0;

  // Mental
  const motivasiKey = Object.keys(mental).find(k => k.includes('motivasi')) || "motivasi";
  const fokusKey = Object.keys(mental).find(k => k.includes('fokus')) || "fokus";
  const pdKey = Object.keys(mental).find(k => k.includes('percaya') || k.includes('pd')) || "kepercayaan diri";
  const stresKey = Object.keys(mental).find(k => k.includes('stres') || k.includes('stress')) || "stres";
  
  const motivasi = mental[motivasiKey] || 0;
  const fokus = mental[fokusKey] || 0;
  const percayadiri = mental[pdKey] || 0;
  const stres = mental[stresKey] || 0;
  
  // Hitung rata-rata komponen mental (ubah stres negatif jadi positif 11 - x)
  const mental_components = [];
  if (mental[motivasiKey]) mental_components.push(motivasi * 10);
  if (mental[fokusKey]) mental_components.push(fokus * 10);
  if (mental[pdKey]) mental_components.push(percayadiri * 10);
  if (mental[stresKey]) mental_components.push((11 - stres) * 10);

  const s_mental = mental_components.length > 0 
    ? mental_components.reduce((a, b) => a + b, 0) / mental_components.length 
    : 0;

  // Holistic Score with Dynamic Weight Normalization
  let w_fisik = s_fisik > 0 ? settings.weight_fisik : 0;
  let w_bia = s_bia > 0 ? settings.weight_bia : 0;
  let w_mental = s_mental > 0 ? settings.weight_mental : 0;
  let w_tidur = s_tidur > 0 ? settings.weight_tidur : 0;
  
  const totalWeight = w_fisik + w_bia + w_mental + w_tidur;
  let skorHolistik = 0;
  
  if (totalWeight > 0) {
    skorHolistik = parseFloat(((
      (w_fisik * s_fisik) + 
      (w_bia * s_bia) + 
      (w_mental * s_mental) + 
      (w_tidur * s_tidur)
    ) / totalWeight).toFixed(1));
  }

  let status = 'Underperform';
  if (skorHolistik >= settings.threshold_prima) status = 'Prima';
  else if (skorHolistik >= settings.threshold_underperform) status = 'Fit';
  
  return { 
    status, 
    spkScore: skorHolistik,
    fisikScore: s_fisik,
    mentalScore: s_mental,
    tidurDurasi: durasi
  };
}

// Criteria and recommendation queries
const getCriteriaWeightsByPosition = async (position) => {
  const result = await pool.query(
    `
      SELECT criteria_name, weight
      FROM criteria_weights
      WHERE position = $1
      ORDER BY criteria_name
    `,
    [position]
  );
  return result.rows;
};

const getAllCriteriaWeights = async () => {
  const result = await pool.query("SELECT * FROM criteria_weights ORDER BY position, criteria_name");
  return result.rows;
};

const updateCriteriaWeight = async (id, weight) => {
  const result = await pool.query("UPDATE criteria_weights SET weight = $1 WHERE id = $2", [weight, id]);
  return result;
};

const getRecommendationRules = async () => {
  const result = await pool.query("SELECT * FROM recommendation_rules ORDER BY priority");
  return result.rows;
};

const createRecommendationRule = async (
  priority,
  triggerCondition,
  recommendationText
) => {
  const result = await pool.query(
    `
      INSERT INTO recommendation_rules (priority, trigger_condition, recommendation_text)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [priority, triggerCondition, recommendationText]
  );
  return result.rows[0];
};

const updateRecommendationRule = async (
  id,
  priority,
  triggerCondition,
  recommendationText
) => {
  const result = await pool.query(
    `
      UPDATE recommendation_rules 
      SET priority = $1, trigger_condition = $2, recommendation_text = $3
      WHERE id = $4
    `,
    [priority, triggerCondition, recommendationText, id]
  );
  return result;
};

const deleteRecommendationRule = async (id) => {
  const result = await pool.query("DELETE FROM recommendation_rules WHERE id = $1", [id]);
  return result;
};

// Evaluate recommendation rules against athlete's latest metrics
async function evaluateRecommendations(athleteId, teamId) {
  const latestAssessmentResult = await pool.query(
    `
      SELECT id FROM assessments 
      WHERE athlete_id = $1 
      ORDER BY date DESC 
      LIMIT 1
    `,
    [athleteId]
  );
  
  const latestAssessment = latestAssessmentResult.rows[0];
  if (!latestAssessment) return [];

  const metricsResult = await pool.query(
    `
      SELECT metric_category, metric_name, value
      FROM assessment_metrics
      WHERE assessment_id = $1
    `,
    [latestAssessment.id]
  );
  const metrics = metricsResult.rows;

  const metricMap = {};
  metrics.forEach((m) => {
    metricMap[m.metric_name] = m.value;
  });

  const rules = await getRecommendationRules();
  const matchedRecommendations = [];
  
  rules.forEach((rule) => {
    try {
      const condition = JSON.parse(rule.trigger_condition);
      let matches = true;

      // Handle structured JSON format
      if (condition.metricName) {
        const actualValue = metricMap[condition.metricName];
        if (actualValue === undefined) {
          matches = false;
        } else {
          const operator = condition.operator;
          const threshold = parseFloat(condition.value);

          switch (operator) {
            case ">=": if (!(actualValue >= threshold)) matches = false; break;
            case ">": if (!(actualValue > threshold)) matches = false; break;
            case "<=": if (!(actualValue <= threshold)) matches = false; break;
            case "<": if (!(actualValue < threshold)) matches = false; break;
            case "==": case "=": if (!(actualValue === threshold)) matches = false; break;
            case "!=": if (!(actualValue !== threshold)) matches = false; break;
            default: matches = false;
          }
        }
      } else {
        // Fallback for old legacy format
        Object.entries(condition).forEach(([metricName, expression]) => {
          const actualValue = metricMap[metricName];
          if (actualValue === undefined) {
            matches = false;
            return;
          }

          const operator = expression.match(/^[<>=!]+/)?.[0] || "==";
          const threshold = parseFloat(expression.replace(/^[<>=!]+/, ""));

          switch (operator) {
            case ">=": if (!(actualValue >= threshold)) matches = false; break;
            case ">": if (!(actualValue > threshold)) matches = false; break;
            case "<=": if (!(actualValue <= threshold)) matches = false; break;
            case "<": if (!(actualValue < threshold)) matches = false; break;
            case "==": case "=": if (!(actualValue === threshold)) matches = false; break;
            case "!=": if (!(actualValue !== threshold)) matches = false; break;
            default: matches = false;
          }
        });
      }

      if (matches) {
        matchedRecommendations.push({
          priority: rule.priority,
          recommendation: rule.recommendation_text,
        });
      }
    } catch (e) {
      console.warn(`Invalid rule condition for rule ID ${rule.id}:`, rule.trigger_condition);
    }
  });

  return matchedRecommendations.sort((a, b) => a.priority - b.priority);
}

// Generate training program recommendations
async function generateTrainingRecommendations(athleteId, teamId) {
  const athlete = await getAthleteById(athleteId, teamId);
  if (!athlete) return [];

  const latestPhysical = await getLatestPhysicalAssessment(athleteId, teamId);
  if (!latestPhysical) return [];

  const weights = await getCriteriaWeightsByPosition(athlete.position);
  const exercises = await getExercises();

  const scoredExercises = exercises.map((ex) => {
    let score = 0;
    weights.forEach((w) => {
      if (ex.focus_area.toLowerCase().includes(w.criteria_name.toLowerCase())) {
        score += w.weight * 10;
      }
    });

    if (athlete.status === "Rehabilitasi" && !ex.type.includes("Rehab")) {
      score -= 5;
    }

    return { ...ex, score };
  });

  return scoredExercises
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((ex) => ({
      exercise_id: ex.id,
      name: ex.name,
      type: ex.type,
      focus_area: ex.focus_area,
      description: ex.description,
    }));
}

module.exports = {
  getAthleteById,
  getAthletesByTeam,
  createAthlete,
  updateAthlete,
  deleteAthlete,
  getAssessmentsByAthlete,
  getAssessmentById,
  createAssessment,
  getExercises,
  createExercise,
  getTrainingProgramsByAthlete,
  createTrainingProgram,
  getTeamById,
  getTeamMembers,
  getTeamAthleteCount,
  getAthletePerformanceData,
  getLatestPhysicalAssessment,
  getLatestMentalAssessment,
  getLatestSleepAssessment,
  getTeamOverview,
  getCriteriaWeightsByPosition,
  getAllCriteriaWeights,
  updateCriteriaWeight,
  getRecommendationRules,
  createRecommendationRule,
  updateRecommendationRule,
  deleteRecommendationRule,
  calculateAthleteStatus,
  evaluateRecommendations,
  generateTrainingRecommendations,
};
