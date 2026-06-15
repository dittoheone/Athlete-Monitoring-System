import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { athleteAPI, dashboardAPI } from "../../../services/api";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Moon,
  Dumbbell,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Lightbulb } from "lucide-react";

const METRIC_CATEGORIES = [
  { value: "Fisik & BIA", label: "Physical" },
  { value: "Mental & Tidur", label: "Mental Health & Sleep" },
  { value: "ERP", label: "ERP" },
];

export default function AthleteProfile() {
  const { id } = useParams();
  const athleteId = id ? id.split('-')[0] : null;
  const navigate = useNavigate();
  const [athlete, setAthlete] = useState(null);
  const [performanceData, setPerformanceData] = useState([]);
  const [physicalData, setPhysicalData] = useState(null);
  const [mentalData, setMentalData] = useState(null);
  const [sleepData, setSleepData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("Fisik & BIA");
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [recommendations, setRecommendations] = useState({
    ruleBased: [],
    trainingSuggestions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (athleteId) {
      fetchAthleteData();
    }
  }, [athleteId]);

  useEffect(() => {
    if (athleteId && selectedCategory) {
      fetchPerformanceData();
    }
  }, [athleteId, selectedCategory, selectedMetric]);

  const fetchAthleteData = async () => {
    try {
      const [athleteRes, physicalRes, mentalRes, sleepRes, recommendationRes] =
        await Promise.all([
          athleteAPI.getById(athleteId),
          dashboardAPI.getPhysical(athleteId),
          dashboardAPI.getMental(athleteId),
          dashboardAPI.getSleep(athleteId),
          dashboardAPI.getRecommendations(athleteId),
        ]);

      setAthlete(athleteRes.data);
      setPhysicalData(physicalRes.data);
      setMentalData(mentalRes.data);
      setSleepData(sleepRes.data);
      setRecommendations(recommendationRes.data);
    } catch (err) {
      console.error("Failed to fetch athlete data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await dashboardAPI.getPerformance(
        athleteId,
        selectedCategory,
        selectedMetric
      );
      setPerformanceData(response.data);
    } catch (err) {
      console.error("Failed to fetch performance data:", err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white rounded-lg animate-pulse">
            <div className="w-1/3 h-6 mb-4 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="p-4 text-red-700 border border-red-200 rounded-lg bg-red-50">
        Athlete not found
      </div>
    );
  }

  // Prepare chart data
  const getPerformanceChartData = () => {
    if (!performanceData || performanceData.length === 0) return [];

    const chartData = [];
    performanceData.forEach((metricGroup) => {
      metricGroup.data.forEach((point) => {
        const existingPoint = chartData.find((p) => p.date === point.date);
        if (existingPoint) {
          existingPoint[point.metric] = point.normalizedScore;
          existingPoint[`${point.metric}_raw`] = point.value;
          existingPoint[`${point.metric}_change`] = point.percentageChange;
        } else {
          chartData.push({
            date: point.date,
            [point.metric]: point.normalizedScore,
            [`${point.metric}_raw`]: point.value,
            [`${point.metric}_change`]: point.percentageChange,
          });
        }
      });
    });

    return chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const radarData =
    physicalData?.metrics.map((m) => ({
      metric: m.metric,
      value: m.normalizedScore,
      rawValue: m.value,
      fullMark: m.maxValue,
    })) || [];

  const mentalBarData =
    mentalData?.metrics.map((m) => ({
      name: m.metric,
      value: m.value,
      maxValue: m.maxValue,
    })) || [];

  const sleepBarData =
    sleepData?.metrics.map((m) => ({
      name: m.metric,
      value: m.value,
      maxValue: m.maxValue,
    })) || [];

  const performanceChartData = getPerformanceChartData();

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/coach/performance")}
          className="flex items-center mb-4 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Team Performance
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{athlete.name}</h2>
            <div className="flex items-center mt-2 space-x-4">
              <span className="text-gray-600">{athlete.position}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  athlete.status === "Prima"
                    ? "bg-green-100 text-green-800"
                    : athlete.status === "Fit"
                    ? "bg-blue-100 text-blue-800"
                    : athlete.status === "Pemulihan"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {athlete.status}
              </span>
            </div>
          </div>

          {athlete.last_assessment_date && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Assessment</p>
              <p className="font-semibold text-gray-900">
                {new Date(athlete.last_assessment_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Tracking Chart */}
      <div className="p-6 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Athlete Growth Tracker
            </h3>
          </div>

          <div className="flex space-x-2">
            {METRIC_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => {
                  setSelectedCategory(cat.value);
                  setSelectedMetric(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedCategory === cat.value
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {performanceChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis domain={[0, 100]} />
              <Tooltip
                labelFormatter={(date) => new Date(date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                formatter={(value, name) => {
                  if (name.includes("_change") || name.includes("_raw")) return null;
                  const changeName = `${name}_change`;
                  const rawName = `${name}_raw`;
                  
                  const dataPoint = performanceChartData.find(d => d[name] === value);
                  const change = dataPoint?.[changeName];
                  const rawVal = dataPoint?.[rawName] || value;
                  
                  return [
                    `${rawVal} ${
                      change ? `(${change > 0 ? "+" : ""}${change}%)` : ""
                    }`,
                    name,
                  ];
                }}
              />
              <Legend />
              {performanceData.map((metricGroup, idx) => (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={metricGroup.metric}
                  stroke={`hsl(${idx * 60}, 70%, 50%)`}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-gray-500">
            No performance data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
        {/* Physical Assessment - Spider Chart */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Physical Assessment
              </h3>
            </div>
            {physicalData?.overallScore !== undefined && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Overall Fitness</p>
                <p className="text-2xl font-bold text-green-600">
                  {physicalData.overallScore}%
                </p>
              </div>
            )}
          </div>

          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Tooltip formatter={(value, name, props) => [props.payload.rawValue, name]} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No physical assessment data
            </div>
          )}
        </div>

        {/* Mental Health - Bar Chart */}
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center mb-4 space-x-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Mental Health
            </h3>
          </div>

          {mentalBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mentalBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 10]} />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-gray-500">
              No mental health data
            </div>
          )}
        </div>
      </div>

      {/* Sleep Quality */}
      <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex items-center mb-4 space-x-2">
          <Moon className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Sleep Quality</h3>
        </div>

        {sleepData?.warning && (
          <div className="flex items-center px-4 py-3 mb-4 text-yellow-800 border border-yellow-200 rounded-lg bg-yellow-50">
            <AlertCircle className="flex-shrink-0 w-5 h-5 mr-2" />
            {sleepData.warning}
          </div>
        )}

        {sleepBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={sleepBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#3b82f6" name="Score" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="py-12 text-center text-gray-500">
            No sleep quality data
          </div>
        )}
      </div>

      {/* Rule-Based Recommendations */}
      {recommendations.ruleBased && recommendations.ruleBased.length > 0 && (
        <div className="p-6 mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex items-center mb-4 space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Medical Recommendations
            </h3>
          </div>
          <div className="space-y-3">
            {recommendations.ruleBased.map((rec, idx) => (
              <div
                key={idx}
                className="p-4 border border-yellow-200 rounded-lg bg-yellow-50"
              >
                <p className="text-gray-800">{rec.recommendation}</p>
                {rec.priority && (
                  <span className="inline-block px-2 py-1 mt-2 text-xs font-medium text-yellow-800 bg-yellow-100 rounded">
                    Priority: {rec.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Suggestions */}
      {recommendations.trainingSuggestions &&
        recommendations.trainingSuggestions.length > 0 && (
          <div className="p-6 mt-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex items-center mb-4 space-x-2">
              <Dumbbell className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Training Suggestions
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recommendations.trainingSuggestions.map((exercise) => (
                <div
                  key={exercise.exercise_id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                  <p className="mt-1 text-sm text-gray-600">
                    {exercise.description || "-"}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="px-2 py-1 text-xs text-blue-800 bg-blue-100 rounded">
                      {exercise.type}
                    </span>
                    <span className="px-2 py-1 text-xs text-purple-800 bg-purple-100 rounded">
                      {exercise.focus_area}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
