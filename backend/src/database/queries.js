const { pool } = require("./init");

// Athlete queries
const getAthleteById = async (athleteId, teamId) => {
  const result = await pool.query(
    `
      SELECT a.*, t.name as team_name
      FROM athletes a
      JOIN teams t ON a.team_id = t.id
      WHERE a.id = $1 AND a.team_id = $2
    `,
    [athleteId, teamId]
  );
  return result.rows[0];
};

const getAthletesByTeam = async (teamId) => {
  const result = await pool.query(
    `
      SELECT * FROM athletes 
      WHERE team_id = $1 
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

const deleteAthlete = async (athleteId, teamId) => {
  const result = await pool.query("DELETE FROM athletes WHERE id = $1 AND team_id = $2", [athleteId, teamId]);
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

    const status = calculateAthleteStatus(metrics);
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
      WHERE assessment_id = $1 AND metric_category = 'Pemeriksaan Fisik'
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
      WHERE assessment_id = $1 AND metric_category = 'Kesehatan Mental'
    `,
    [latestAssessment.id]
  );

  return { latestAssessment, metrics: metricsResult.rows };
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
      WHERE assessment_id = $1 AND metric_category = 'Kualitas Tidur'
    `,
    [latestAssessment.id]
  );

  return { latestAssessment, metrics: metricsResult.rows };
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
  return result.rows;
};

// Helper functions
function calculateAthleteStatus(metrics) {
  const physical = metrics["Pemeriksaan Fisik"] || {};
  const mental = metrics["Kesehatan Mental"] || {};
  const rehab = metrics["Rehabilitasi"] || {};

  if (rehab.Cedera && rehab.Cedera >= 7) {
    return "Rehabilitasi";
  }
  if (rehab.Pemulihan && rehab.Pemulihan < 5) {
    return "Pemulihan";
  }

  const physicalValues = Object.values(physical);
  const mentalValues = Object.values(mental);
  const avgPhysical =
    physicalValues.length > 0
      ? physicalValues.reduce((a, b) => a + b, 0) / physicalValues.length
      : 5;
  const avgMental =
    mentalValues.length > 0
      ? mentalValues.reduce((a, b) => a + b, 0) / mentalValues.length
      : 5;

  if (avgPhysical >= 8 && avgMental >= 8) return "Prima";
  if (avgPhysical >= 6 && avgMental >= 6) return "Fit";
  return "Pemulihan";
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
