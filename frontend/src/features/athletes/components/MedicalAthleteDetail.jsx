import { useState, useEffect } from "react";
import { athleteAPI, assessmentAPI, dashboardAPI } from "../../../services/api";
import {
  ArrowLeft,
  Calendar,
  Activity,
  FileText,
  User,
  ShieldAlert,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import { generatePDFReport } from "../../../utils/pdfGenerator";
import AssessmentForm from "../../assessments/components/AssessmentForm";
import { recommendationAPI } from "../../../services/api";

import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusStyles = {
  Prima: "bg-green-100 text-green-700",
  Fit: "bg-blue-100 text-blue-700",
  Underperform: "bg-orange-100 text-orange-700",
  Rehabilitasi: "bg-yellow-100 text-yellow-700",
  Cedera: "bg-red-100 text-red-700",
};

export default function AthleteDetail({ athleteId: propAthleteId, onBack }) {
  const queryClient = useQueryClient();
  const { id: paramAthleteId } = useParams();
  const athleteId = propAthleteId || paramAthleteId;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profil");
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [expandedAssessments, setExpandedAssessments] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("Fisik & BIA");

  const toggleAssessment = (id) => {
    setExpandedAssessments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: athleteRes, isLoading: loadingAthlete } = useQuery({
    queryKey: ['athlete', athleteId],
    queryFn: () => athleteAPI.getById(athleteId),
    enabled: !!athleteId
  });

  const { data: assessmentsRes, isLoading: loadingAssessments } = useQuery({
    queryKey: ['assessments', athleteId],
    queryFn: () => assessmentAPI.getByAthlete(athleteId),
    enabled: !!athleteId
  });

  const { data: performanceRes, isLoading: loadingPerformance } = useQuery({
    queryKey: ['performance', athleteId, selectedCategory],
    queryFn: () => dashboardAPI.getPerformance(athleteId, selectedCategory),
    enabled: !!athleteId && !!selectedCategory
  });

  const { data: recommendationsRes, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['recommendations', athleteId],
    queryFn: () => recommendationAPI.getHolistic(athleteId),
    enabled: !!athleteId
  });

  const { data: physicalRes, isLoading: loadingPhysical } = useQuery({
    queryKey: ['physical', athleteId],
    queryFn: () => dashboardAPI.getPhysical(athleteId),
    enabled: !!athleteId
  });

  const athlete = athleteRes?.data;
  const assessments = assessmentsRes?.data || [];
  const performanceData = performanceRes?.data || [];
  const recommendations = recommendationsRes?.data || null;
  const physicalData = physicalRes?.data || null;
  const loading = loadingAthlete || loadingAssessments || loadingRecommendations || loadingPhysical;

  const handleExportPDF = () => {
    if (!athlete) return;
    const columns = ["Tanggal", "Asesor", "Catatan", "Detail Skor Assessment"];
    const data = assessments.map(a => {
      let metricsText = "-";
      if (a.metrics && a.metrics.length > 0) {
        metricsText = a.metrics
          .map(m => `${m.metric_name}: ${m.value}`)
          .join("\n");
      }
      return [
        new Date(a.date).toLocaleDateString('id-ID'),
        a.assessor_name || "Sistem",
        a.notes || "-",
        metricsText
      ];
    });

    generatePDFReport(
      `Rekam Medis: ${athlete.name}`,
      columns,
      data,
      `rekam_medis_${athlete.name.replace(/\s+/g, "_").toLowerCase()}.pdf`
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-48 bg-white rounded-2xl animate-pulse"></div>
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

  const latestAssessment = assessments && assessments.length > 0 ? assessments[0] : null;
  let radarData = [
    { subject: "Kecepatan", A: 0, fullMark: 100 },
    { subject: "Kekuatan", A: 0, fullMark: 100 },
    { subject: "Daya Tahan", A: 0, fullMark: 100 },
  ];

  if (physicalData && physicalData.metrics) {
    radarData = physicalData.metrics.map(m => ({
      subject: m.metric.split(' (')[0],
      A: m.normalizedScore,
      fullMark: m.maxValue
    }));
  }

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

  const performanceChartData = getPerformanceChartData();

  return (
    <div className="max-w-5xl mx-auto font-sans">
      <button
        onClick={() => {
          if (onBack) onBack();
          else navigate("/medis/athletes");
        }}
        className="flex items-center text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Kembali ke Daftar Atlet
      </button>

      {/* Main Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {athlete.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{athlete.name}</h1>
              <div className="text-sm text-gray-500 mt-1 flex items-center space-x-2">
                <span>{athlete.position}</span>
                <span>•</span>
                <span>
                  {athlete.date_of_birth
                    ? `${new Date().getFullYear() - new Date(athlete.date_of_birth).getFullYear()} tahun`
                    : "Usia tidak diketahui"}
                </span>
                <span>•</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                    statusStyles[athlete.status] || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {athlete.status}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={handleExportPDF}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center border border-gray-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Cetak Rekam Medis
            </button>
            <button 
              onClick={() => setIsAssessmentModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
            >
              <Activity className="w-4 h-4 mr-2" />
              Input Assessment
            </button>
            <button 
              onClick={() => navigate("/medis/injuries")}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Catat Cedera
            </button>
          </div>
        </div>

        {/* Mini Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-gray-100">
          <div className="bg-blue-50/50 p-3 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Data Fisik Terakhir</span>
            <span className="text-sm font-bold text-gray-900">
              {athlete.last_assessment_date ? new Date(athlete.last_assessment_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
            </span>
          </div>
          <div className="bg-green-50/50 p-3 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Data Tidur Terakhir</span>
            <span className="text-sm font-bold text-gray-900">
              {athlete.last_assessment_date ? new Date(athlete.last_assessment_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
            </span>
          </div>
          <div className="bg-purple-50/50 p-3 rounded-xl flex flex-col items-center justify-center">
            <span className="text-xs text-purple-600 font-semibold uppercase tracking-wider mb-1">Data Mental Terakhir</span>
            <span className="text-sm font-bold text-gray-900">
              {athlete.last_assessment_date ? new Date(athlete.last_assessment_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("profil")}
          className={`pb-4 px-6 text-sm font-medium flex items-center transition-colors border-b-2 ${
            activeTab === "profil"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <User className="w-4 h-4 mr-2" />
          Profil
        </button>
        <button
          onClick={() => setActiveTab("riwayat")}
          className={`pb-4 px-6 text-sm font-medium flex items-center transition-colors border-b-2 ${
            activeTab === "riwayat"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          Riwayat
        </button>
        <button
          onClick={() => setActiveTab("visual")}
          className={`pb-4 px-6 text-sm font-medium flex items-center transition-colors border-b-2 ${
            activeTab === "visual"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Activity className="w-4 h-4 mr-2" />
          Visualisasi Performa
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        
        {activeTab === "profil" && (
          <div className="grid grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Profil Atlet</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">Nama Lengkap</span>
                  <span className="text-sm font-medium text-gray-900">{athlete.name}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">Posisi</span>
                  <span className="text-sm font-medium text-gray-900">{athlete.position}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">Tanggal Lahir</span>
                  <span className="text-sm font-medium text-gray-900">
                    {athlete.date_of_birth ? new Date(athlete.date_of_birth).toLocaleDateString('id-ID') : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4">Status Terkini</h3>
              <div className="space-y-3">
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">Status Kesiapan</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusStyles[athlete.status] || "bg-gray-100"}`}>
                    {athlete.status}
                  </span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2">
                  <span className="text-sm text-gray-500">Terakhir Diasses</span>
                  <span className="text-sm font-medium text-gray-900">
                    {athlete.last_assessment_date ? new Date(athlete.last_assessment_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations Embedded in Profil */}
            {recommendations && (
              <div className="col-span-2 mt-6 pt-6 border-t border-gray-100">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
                      <ShieldAlert className="w-5 h-5 text-red-500 mr-2" />
                      Peringatan & Saran Medis
                    </h3>
                    {recommendations.ruleBased && recommendations.ruleBased.length > 0 ? (
                      <ul className="space-y-3">
                        {recommendations.ruleBased.map((rec, i) => (
                          <li key={i} className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800 flex items-start">
                            <span className="bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded mr-3 mt-0.5 text-xs">Prioritas {rec.priority}</span>
                            <span>{rec.recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
                        Kondisi stabil. Tidak ada peringatan medis khusus saat ini.
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4 mt-8 flex items-center">
                      <Activity className="w-5 h-5 text-blue-500 mr-2" />
                      Rekomendasi Program Latihan
                    </h3>
                    {recommendations.trainingSuggestions && recommendations.trainingSuggestions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {recommendations.trainingSuggestions.map((rec, i) => (
                          <div key={i} className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-900 text-sm">{rec.name}</h4>
                              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">{rec.type}</span>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{rec.description}</p>
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                                Area: {rec.focus_area}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Tidak ada rekomendasi spesifik saat ini.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "riwayat" && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-4">Riwayat Assessment</h3>
            {assessments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Belum ada riwayat assessment.</p>
            ) : (
              <div className="space-y-4">
                {assessments.map(a => (
                  <div key={a.id} className="border border-gray-100 rounded-lg overflow-hidden transition-colors">
                    <div 
                      className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center bg-white"
                      onClick={() => toggleAssessment(a.id)}
                    >
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-900 text-sm">Assessment {new Date(a.date).toLocaleDateString('id-ID')}</span>
                          <span className="text-xs text-gray-500">Oleh: {a.assessor_name || "Sistem"}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {a.notes || "Tidak ada catatan."}
                        </p>
                      </div>
                      <div className="ml-4 text-gray-400">
                        {expandedAssessments[a.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                    
                    {/* Expanded Detail View */}
                    {expandedAssessments[a.id] && a.metrics && a.metrics.length > 0 && (
                      <div className="bg-gray-50 p-4 border-t border-gray-100">
                        {['Fisik & BIA', 'Mental & Tidur', 'ERP'].map(cat => {
                          const catMetrics = a.metrics.filter(m => m.metric_category === cat);
                          if (catMetrics.length === 0) return null;
                          return (
                            <div key={cat} className="mb-4 last:mb-0">
                              <h4 className="text-xs font-bold text-gray-900 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">{cat}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                {catMetrics.map((m, idx) => (
                                  <div key={idx} className="flex justify-between pb-1">
                                    <span className="text-xs text-gray-600">{m.metric_name}</span>
                                    <span className="text-xs font-semibold text-gray-900">{m.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "visual" && (
          <div className="space-y-12">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-6 text-center">Spider Chart - Data Fisik Terbaru</h3>
              <div className="h-[400px] w-full flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="Performa"
                      dataKey="A"
                      stroke="#2563eb"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-bold text-gray-900">Athlete Growth Tracker</h3>
                <div className="flex space-x-2">
                  {["Fisik & BIA", "Mental & Tidur", "ERP"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedCategory === cat
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {loadingPerformance ? (
                <div className="h-[300px] w-full flex items-center justify-center text-gray-500">
                  Loading data...
                </div>
              ) : performanceChartData.length > 0 ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={performanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(date) =>
                          new Date(date).toLocaleDateString("id-ID", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(date) => new Date(date).toLocaleDateString('id-ID')}
                        formatter={(value, name) => {
                          if (name.includes("_change") || name.includes("_raw")) return null;
                          const changeName = `${name}_change`;
                          const rawName = `${name}_raw`;
                          const dataPoint = performanceChartData.find(d => d[name] === value);
                          const change = dataPoint?.[changeName];
                          const rawVal = dataPoint?.[rawName] || value;
                          return [
                            `${rawVal} ${change ? `(${change > 0 ? "+" : ""}${change}%)` : ""}`,
                            name,
                          ];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      {performanceData.map((metricGroup, idx) => (
                        <Line
                          key={idx}
                          type="monotone"
                          dataKey={metricGroup.metric}
                          stroke={`hsl(${idx * 45}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-500 text-sm">
                  Belum ada data history yang cukup untuk menampilkan grafik.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AssessmentForm 
        isOpen={isAssessmentModalOpen} 
        onClose={() => {
          setIsAssessmentModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['assessments', athleteId] });
          queryClient.invalidateQueries({ queryKey: ['athlete', athleteId] });
        }} 
        athleteId={athleteId} 
        athleteName={athlete.name} 
      />
    </div>
  );
}
