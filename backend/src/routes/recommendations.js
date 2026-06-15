const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const queries = require("../database/queries");

const router = express.Router();
router.use(authenticateToken);

const getTeamId = (req) => req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null);


// Get holistic recommendations for an athlete
router.get("/athlete/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;

    // Verify athlete belongs to user's team
    const athlete = await queries.getAthleteById(athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)));
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Get rule-based recommendations
    const ruleRecommendations = await queries.evaluateRecommendations(
      athleteId,
      (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))
    );

    // Get training recommendations
    const trainingRecommendations = await queries.generateTrainingRecommendations(
      athleteId,
      (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null))
    );

    res.json({
      athlete: {
        id: athlete.id,
        name: athlete.name,
        status: athlete.status,
        position: athlete.position,
      },
      ruleBased: ruleRecommendations,
      trainingSuggestions: trainingRecommendations,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

// Create training program from suggestion (Medical only)
router.post("/training-program", async (req, res) => {
  try {
    const { athleteId, exerciseId, ...programData } = req.body;

    const athlete = await queries.getAthleteById(athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)));
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const programId = await queries.createTrainingProgram(
      athleteId,
      exerciseId,
      programData
    );

    res.status(201).json({
      message: "Training program created successfully",
      programId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create training program" });
  }
});

// Get auto-generated exercise recommendations for an athlete
router.get("/training/:athleteId", async (req, res) => {
  try {
    const { athleteId } = req.params;

    // Verify athlete belongs to user's team
    const athlete = await queries.getAthleteById(athleteId, (req.query.teamId || (req.user.teams && req.user.teams.length > 0 ? req.user.teams[0].id : null)));
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Get criteria weights for athlete's position
    const weights = await queries.getCriteriaWeightsByPosition(athlete.position);
    if (!weights || weights.length === 0) {
      return res
        .status(404)
        .json({ error: "No criteria weights found for position" });
    }

    // Get all exercises
    const exercises = await queries.getExercises();

    // Score exercises based on focus_area match
    const scoredExercises = exercises.map((ex) => {
      let score = 0;
      weights.forEach((w) => {
        // Match mapped_metric or focus_area (case-insensitive partial match)
        const metricMatch = ex.mapped_metric && ex.mapped_metric.toLowerCase().includes(w.criteria_name.toLowerCase());
        const focusMatch = ex.focus_area && ex.focus_area.toLowerCase().includes(w.criteria_name.toLowerCase());
        
        if (metricMatch || focusMatch) {
          score += w.weight * 100; // Convert weight (0.25) → 25 points
        }
      });

      // Penalize if athlete is in rehabilitation but exercise isn't rehab-focused
      if (
        athlete.status === "Rehabilitasi" &&
        !ex.type.toLowerCase().includes("rehab")
      ) {
        score -= 20;
      }

      return { ...ex, score: Math.max(0, score) };
    });

    // Return top 5 exercises
    const topExercises = scoredExercises
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ id, name, type, focus_area, description, mapped_metric, frequency, intensity, time_duration, type_fitt, sets, reps, score }) => ({
        exercise_id: id,
        name,
        type,
        focus_area,
        description,
        mapped_metric,
        frequency,
        intensity,
        time_duration,
        type_fitt,
        sets,
        reps,
        score: Math.round(score),
      }));

    res.json({ recommendations: topExercises });
  } catch (error) {
    console.error("Training recommendation error:", error);
    res
      .status(500)
      .json({ error: "Failed to generate training recommendations" });
  }
});

module.exports = router;
