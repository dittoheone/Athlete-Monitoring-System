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

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (data) => api.post("/auth/register", data),
};

// Athlete APIs
export const athleteAPI = {
  getAll: () => api.get("/athletes"),
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
  getRecommendations: (athleteId) =>
    api.get(`/recommendations/athlete/${athleteId}`),
};

// Exercise APIs
export const exerciseAPI = {
  getAll: () => api.get("/exercises"),
  create: (data) => api.post("/exercises", data),
  getPrograms: (athleteId) =>
    api.get(`/exercises/programs/athlete/${athleteId}`),
  createProgram: (data) => api.post("/exercises/programs", data),
  getTrainingPrograms: () => api.get("/exercises/programs"),
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
};

export default api;
