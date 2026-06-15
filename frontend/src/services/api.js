import axios from "axios";

// frontend/src/services/api.js
const API_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token and activeTeamId to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Automatically inject teamId to query params
    const activeTeamId = localStorage.getItem("activeTeamId");
    if (activeTeamId && activeTeamId !== "undefined" && activeTeamId !== "null") {
      config.params = { ...config.params, teamId: activeTeamId };
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (data) => api.post("/auth/register", data),
  changePassword: (newPassword) => api.post("/auth/change-password", { newPassword }),
};

// Support APIs
export const supportAPI = {
  createTicket: (data) => api.post("/support", data),
  getAll: () => api.get("/support"),
  resolve: (id, action) => api.put(`/support/${id}/resolve`, { action }),
};

// Athlete APIs
export const athleteAPI = {
  getAll: (page, limit) => api.get("/athletes", { params: { page, limit } }),
  getById: (id) => api.get(`/athletes/${id}`),
  create: (data) => api.post("/athletes", data),
  update: (id, data) => api.put(`/athletes/${id}`, data),
  delete: (id) => api.delete(`/athletes/${id}`),
};

// Assessment APIs
export const assessmentAPI = {
  getByAthlete: (athleteId) => api.get(`/assessments/athlete/${athleteId}`),
  getById: (id) => api.get(`/assessments/${id}`),
  create: (data) => api.post("/assessments", data),
  getMetricStructure: () => api.get("/assessments/metrics/structure"),
};

// Dashboard APIs
export const dashboardAPI = {
  getPerformance: (athleteId, category, metric) =>
    api.get(`/dashboard/athlete/${athleteId}/performance`, {
      params: { category, metric },
    }),
  getPhysical: (athleteId) =>
    api.get(`/dashboard/athlete/${athleteId}/physical`),
  getMental: (athleteId) => api.get(`/dashboard/athlete/${athleteId}/mental`),
  getSleep: (athleteId) => api.get(`/dashboard/athlete/${athleteId}/sleep`),
  getTeamOverview: () => api.get("/dashboard/team/overview"),
  getTeamAlerts: () => api.get("/dashboard/team/alerts"),
  getRecommendations: (athleteId) =>
    api.get(`/recommendations/athlete/${athleteId}`),
};

// Schedule APIs
export const scheduleAPI = {
  getAll: () => api.get("/schedules"),
  create: (data) => api.post("/schedules", data),
  delete: (id) => api.delete(`/schedules/${id}`),
};

// Exercise APIs
export const exerciseAPI = {
  getAll: () => api.get("/exercises"),
  create: (data) => api.post("/exercises", data),
  getPrograms: (athleteId) =>
    api.get(`/exercises/programs/athlete/${athleteId}`),
  createProgram: (data) => api.post("/exercises/programs", data),
  getTrainingPrograms: () => api.get("/exercises/programs"),
  delete: (id) => api.delete(`/exercises/${id}`),
  update: (id, data) => api.put(`/exercises/${id}`, data),
};

// Team APIs
export const teamAPI = {
  getAll: () => api.get("/teams"),
  getMyTeam: () => api.get("/teams/my-team"),
  getCriteriaWeights: () => api.get("/teams/criteria-weights"),
  updateCriteriaWeight: (id, weight) =>
    api.put(`/teams/criteria-weights/${id}`, { weight }),
  getRecommendationRules: () => api.get("/teams/recommendation-rules"),
  createRecommendationRule: (priority, triggerCondition, recommendationText) =>
    api.post("/teams/recommendation-rules", {
      priority,
      triggerCondition,
      recommendationText,
    }),
  updateRecommendationRule: (
    id,
    priority,
    triggerCondition,
    recommendationText
  ) =>
    api.put(`/teams/recommendation-rules/${id}`, {
      priority,
      triggerCondition,
      recommendationText,
    }),
  deleteRecommendationRule: (id) => api.delete(`/teams/recommendation-rules/${id}`),
};

// Injury APIs
export const injuryAPI = {
  getAll: (page, limit) => api.get("/injuries", { params: { page, limit } }),
  create: (data) => api.post("/injuries", data),
  update: (id, data) => api.put(`/injuries/${id}`, data),
  delete: (id) => api.delete(`/injuries/${id}`),
};

// Settings APIs
export const settingsAPI = {
  getSettings: () => api.get("/settings"),
  updateSettings: (data) => api.put("/settings", data),
  getStandards: () => api.get("/settings/standards"),
  updateStandard: (data) => api.put("/settings/standards", data),
};

// Match APIs
export const matchAPI = {
  getAll: () => api.get("/matches"),
  create: (data) => api.post("/matches", data),
  getStats: (id) => api.get(`/matches/${id}/stats`),
  addStat: (id, data) => api.post(`/matches/${id}/stats`, data),
};

// Recommendation APIs
export const recommendationAPI = {
  getHolistic: (athleteId) => api.get(`/recommendations/athlete/${athleteId}`)
};

// Recycle Bin APIs
export const recycleBinAPI = {
  getItems: (type) => api.get(`/recycle-bin/${type}`),
  restoreItem: (type, id) => api.post(`/recycle-bin/${type}/${id}/restore`),
};

// Admin APIs
export const adminAPI = {
  getStats: () => api.get("/admin/stats"),
  getActivityLogs: () => api.get("/admin/activity-logs"),
  getUsers: () => api.get("/admin/users"),
  createUser: (data) => api.post("/admin/users", data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
};

export default api;
