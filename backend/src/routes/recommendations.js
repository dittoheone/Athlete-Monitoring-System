const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const queries = require("../database/queries");

const router = express.Router();
router.use(authenticateToken);

// Get holistic recommendations for an athlete
router.get("/athlete/:athleteId", (req, res) => {
  try {
    const { athleteId } = req.params;

    // Verify athlete belongs to user's team
    const athlete = queries.getAthleteById(athleteId, req.user.teamId);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Get rule-based recommendations
    const ruleRecommendations = queries.evaluateRecommendations(
      athleteId,
      req.user.teamId
    );

    // Get training recommendations
    const trainingRecommendations = queries.generateTrainingRecommendations(
      athleteId,
      req.user.teamId
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
router.post("/training-program", (req, res) => {
  try {
    const { athleteId, exerciseId, ...programData } = req.body;

    const athlete = queries.getAthleteById(athleteId, req.user.teamId);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    const programId = queries.createTrainingProgram(
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
router.get("/training/:athleteId", (req, res) => {
  try {
    const { athleteId } = req.params;

    // Verify athlete belongs to user's team
    const athlete = queries.getAthleteById(athleteId, req.user.teamId);
    if (!athlete) {
      return res.status(404).json({ error: "Athlete not found" });
    }

    // Get criteria weights for athlete's position
    const weights = queries.getCriteriaWeightsByPosition(athlete.position);
    if (!weights || weights.length === 0) {
      return res
        .status(404)
        .json({ error: "No criteria weights found for position" });
    }

    // Get all exercises
    const exercises = queries.getExercises();

    // Score exercises based on focus_area match
    const scoredExercises = exercises.map((ex) => {
      let score = 0;
      weights.forEach((w) => {
        // Match focus_area (case-insensitive partial match)
        if (
          ex.focus_area.toLowerCase().includes(w.criteria_name.toLowerCase())
        ) {
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
      .map(({ id, name, type, focus_area, description, score }) => ({
        exercise_id: id,
        name,
        type,
        focus_area,
        description,
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
