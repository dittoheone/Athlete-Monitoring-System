const express = require("express");
const { pool } = require("../database/init");
const { authenticateToken, authorizeRole } = require("../middleware/auth");
const queries = require("../database/queries");
const teamRouter = express.Router();

teamRouter.use(authenticateToken);

// Get all teams
teamRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM teams");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// Get user's team details
teamRouter.get("/my-team", async (req, res) => {
  try {
    const team = await queries.getTeamById(req.user.teamId);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const members = await queries.getTeamMembers(req.user.teamId);
    const athleteCount = await queries.getTeamAthleteCount(req.user.teamId);

    res.json({
      ...team,
      members,
      athleteCount: athleteCount.count,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch team details" });
  }
});

// Get team overview for dashboard
teamRouter.get("/overview", async (req, res) => {
  try {
    const athletes = await queries.getTeamOverview(req.user.teamId);

    // Get status distribution
    const statusCounts = {
      Prima: 0,
      Fit: 0,
      Pemulihan: 0,
      Rehabilitasi: 0,
    };
    athletes.forEach((a) => {
      statusCounts[a.status]++;
    });

    // Get position distribution
    const positionCounts = {
      Striker: 0,
      Midfielder: 0,
      Defender: 0,
      Goalkeeper: 0,
    };
    athletes.forEach((a) => {
      positionCounts[a.position]++;
    });

    // Calculate team average physical score
    const recentAssessmentsResult = await pool.query(
      `
        SELECT DISTINCT ON (a.athlete_id) 
          am.value
        FROM assessments a
        JOIN assessment_metrics am ON a.id = am.assessment_id
        JOIN athletes ath ON a.athlete_id = ath.id
        WHERE ath.team_id = $1 
          AND am.metric_category = 'Pemeriksaan Fisik'
        ORDER BY a.athlete_id, a.date DESC
      `,
      [req.user.teamId]
    );
    const recentAssessments = recentAssessmentsResult.rows;

    const avgTeamFitness =
      recentAssessments.length > 0
        ? Math.round(
            (recentAssessments.reduce((sum, r) => sum + r.value, 0) /
              recentAssessments.length) *
              10
          )
        : 0;

    res.json({
      totalAthletes: athletes.length,
      statusDistribution: statusCounts,
      positionDistribution: positionCounts,
      avgTeamFitness,
      athletes: athletes.map((a) => ({
        id: a.id,
        name: a.name,
        position: a.position,
        status: a.status,
        lastAssessment: a.last_assessment_date,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch team overview" });
  }
});

// Get criteria weights (Medical team only)
teamRouter.get("/criteria-weights", authorizeRole("medis"), async (req, res) => {
  try {
    const criteriaWeights = await queries.getAllCriteriaWeights();
    res.json(criteriaWeights);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch criteria weights" });
  }
});

// Update criteria weight (Medical team only)
teamRouter.put("/criteria-weights/:id", authorizeRole("medis"), async (req, res) => {
  try {
    const { weight } = req.body;
    const { id } = req.params;

    if (weight === undefined || weight < 0 || weight > 1) {
      return res
        .status(400)
        .json({ error: "Invalid weight value. Must be between 0 and 1." });
    }

    const result = await queries.updateCriteriaWeight(id, weight);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Criteria weight not found" });
    }

    res.json({ message: "Criteria weight updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update criteria weight" });
  }
});

// Get recommendation rules (Medical team only)
teamRouter.get("/recommendation-rules", authorizeRole("medis"), async (req, res) => {
  try {
    const rules = await queries.getRecommendationRules();
    res.json(rules);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch recommendation rules" });
  }
});

// Create recommendation rule (Medical team only)
teamRouter.post("/recommendation-rules", authorizeRole("medis"), async (req, res) => {
  try {
    const { priority, triggerCondition, recommendationText } = req.body;

    if (!priority || !triggerCondition || !recommendationText) {
      return res.status(400).json({
        error:
          "Priority, trigger condition, and recommendation text are required",
      });
    }

    const newRule = await queries.createRecommendationRule(
      priority,
      triggerCondition,
      recommendationText
    );
    
    res.status(201).json({
      message: "Recommendation rule created successfully",
      ruleId: newRule.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create recommendation rule" });
  }
});

// Update recommendation rule (Medical team only)
teamRouter.put(
  "/recommendation-rules/:id",
  authorizeRole("medis"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { priority, triggerCondition, recommendationText } = req.body;

      if (!priority || !triggerCondition || !recommendationText) {
        return res.status(400).json({
          error:
            "Priority, trigger condition, and recommendation text are required",
        });
      }

      const result = await queries.updateRecommendationRule(
        id,
        priority,
        triggerCondition,
        recommendationText
      );
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Recommendation rule not found" });
      }

      res.json({ message: "Recommendation rule updated successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update recommendation rule" });
    }
  }
);

// Delete recommendation rule (Medical team only)
teamRouter.delete(
  "/recommendation-rules/:id",
  authorizeRole("medis"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const result = await queries.deleteRecommendationRule(id);
      
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Recommendation rule not found" });
      }

      res.json({ message: "Recommendation rule deleted successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete recommendation rule" });
    }
  }
);

module.exports = teamRouter;
