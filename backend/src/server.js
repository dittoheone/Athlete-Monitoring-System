require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initializeDatabase } = require("./database/init");

// Initialize database
initializeDatabase();

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173", // untuk dev lokal
      "https://athlete-monitoring-system-aw7l.vercel.app", // ganti dengan domain Vercel-mu
      "https://athlete-monitoring-system-aw7l-git-main-yanardrognuhs-projects.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Import routes
const authRoutes = require("./routes/auth");
const athleteRoutes = require("./routes/athletes");
const assessmentRoutes = require("./routes/assessments");
const teamRouter = require("./routes/teams");
const exerciseRouter = require("./routes/exercises").exerciseRouter;
const dashboardRoutes = require("./routes/dashboard");
const recommendationRoutes = require("./routes/recommendations");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/athletes", athleteRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/teams", teamRouter);
app.use("/api/exercises", exerciseRouter);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/recommendations", recommendationRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
});
