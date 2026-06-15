import { useState, useEffect } from "react";
import { dashboardAPI } from "../../../services/api";
import { Activity, Brain, Moon, Users, Eye, BarChart2, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";

import { useQuery } from "@tanstack/react-query";
import Pagination from "../../../components/common/Pagination";

const COLORS = {
  Prima: "#10b981",      // green-500
  Fit: "#3b82f6",        // blue-500
  Pemulihan: "#f59e0b",  // amber-500
  Rehabilitasi: "#f97316",// orange-500
  Underperform: "#6366f1", // indigo-500
  Cedera: "#ef4444"      // red-500
};

export default function TeamPerformance() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [filterPos, setFilterPos] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentPage(1);
  }, [filterPos, filterStatus]);

  const { data: overview, isLoading: loading } = useQuery({
    queryKey: ['teamOverview'],
    queryFn: () => dashboardAPI.getTeamOverview().then(res => res.data)
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white h-64 rounded-2xl animate-pulse"></div>
          <div className="bg-white h-64 rounded-2xl animate-pulse"></div>
        </div>
        <div className="bg-white h-96 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const pieData = overview ? Object.entries(overview.statusDistribution)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({ name, value })) : [];

  const athletes = overview?.athletes || [];
  
  // Use actual SPK rating
  const rankedAthletes = [...athletes].sort((a, b) => (b.spkScore || 0) - (a.spkScore || 0));

  const filteredAthletes = rankedAthletes.filter(a => {
    const matchPos = filterPos === "Semua" || a.position === filterPos;
    const matchStatus = filterStatus === "Semua" || a.status === filterStatus;
    return matchPos && matchStatus;
  });

  const totalPages = Math.ceil(filteredAthletes.length / limit) || 1;
  const paginatedAthletes = filteredAthletes.slice((currentPage - 1) * limit, currentPage * limit);

  const positions = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
  const positionData = positions.map(pos => {
    const posAthletes = athletes.filter(a => a.position === pos);
    const result = { position: pos, Prima: 0, Fit: 0, Underperform: 0, Pemulihan: 0, Rehabilitasi: 0, Cedera: 0 };
    posAthletes.forEach(a => {
      if (result[a.status] !== undefined) result[a.status]++;
    });
    return result;
  });

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performa Tim & SPK</h1>
          <p className="text-sm text-gray-500 mt-1">Analisis performa keseluruhan tim dan peringkat rekomendasi atlet.</p>
        </div>
      </div>

      {/* TABS */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "analytics" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Ringkasan Analitik</span>
        </button>
        <button
          onClick={() => setActiveTab("athletes")}
          className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === "athletes" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
          }`}
        >
          <List className="w-4 h-4" />
          <span>Daftar Atlet & Peringkat</span>
        </button>
      </div>

      {activeTab === "analytics" ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribusi Status Atlet */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Distribusi Status Atlet</h3>
              <div className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name] || "#cbd5e1"} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Statistik Tim */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-6">Statistik Tim</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Rata-rata Fisik</p>
                    <p className="text-xl font-bold text-gray-900">{overview?.avgTeamFitness || 0}</p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex items-start space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Rata-rata Mental</p>
                    <p className="text-xl font-bold text-gray-900">{overview?.avgTeamMental || 0}</p>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start space-x-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Kualitas Tidur</p>
                    <p className="text-xl font-bold text-gray-900">{overview?.avgTeamTidur || 0} <span className="text-sm text-gray-500 font-medium">Jam</span></p>
                  </div>
                </div>

                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 flex items-start space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-1">Pemain Aktif</p>
                    <p className="text-xl font-bold text-gray-900">{overview?.totalAthletes || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status Kesiapan per Posisi */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Status Kesiapan per Posisi</h3>
            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={positionData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="position" type="category" width={80} tick={{fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="Prima" stackId="a" fill={COLORS.Prima} />
                  <Bar dataKey="Fit" stackId="a" fill={COLORS.Fit} />
                  <Bar dataKey="Pemulihan" stackId="a" fill={COLORS.Pemulihan} />
                  <Bar dataKey="Rehabilitasi" stackId="a" fill={COLORS.Rehabilitasi} />
                  <Bar dataKey="Underperform" stackId="a" fill={COLORS.Underperform} />
                  <Bar dataKey="Cedera" stackId="a" fill={COLORS.Cedera} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Peringkat SPK Keseluruhan</h3>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={filterPos}
                onChange={(e) => setFilterPos(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Semua">Semua Posisi</option>
                <option value="Striker">Striker</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Defender">Defender</option>
                <option value="Goalkeeper">Goalkeeper</option>
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Semua">Semua Status</option>
                <option value="Prima">Prima</option>
                <option value="Fit">Fit</option>
                <option value="Underperform">Underperform</option>
                <option value="Cedera">Cedera</option>
              </select>
            </div>
          </div>
          
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-20">Rank</th>
                  <th className="px-6 py-4">Nama Atlet</th>
                  <th className="px-6 py-4">Posisi</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 w-48">Skor Akhir (SPK)</th>
                  <th className="px-6 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedAthletes.map((athlete, index) => {
                  const globalRank = ((currentPage - 1) * limit) + index + 1;
                  return (
                    <tr key={athlete.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                          ${globalRank === 1 ? "bg-yellow-100 text-yellow-700" : 
                            globalRank === 2 ? "bg-gray-200 text-gray-700" : 
                            globalRank === 3 ? "bg-amber-100 text-amber-700" : "text-gray-500"}`}
                        >
                          {globalRank}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{athlete.name}</td>
                      <td className="px-6 py-4">{athlete.position}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                          ${athlete.status === 'Prima' ? 'bg-green-100 text-green-700' :
                            athlete.status === 'Fit' ? 'bg-blue-100 text-blue-700' :
                            athlete.status === 'Underperform' ? 'bg-indigo-100 text-indigo-700' :
                            athlete.status === 'Cedera' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'}`}
                        >
                          {athlete.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${parseFloat(athlete.spkScore) >= 80 ? 'bg-green-500' : parseFloat(athlete.spkScore) >= 70 ? 'bg-blue-500' : 'bg-red-500'}`}
                              style={{ width: `${athlete.spkScore}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-900 w-8">{athlete.spkScore}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => navigate(`/coach/athletes/${athlete.id}-${athlete.name.toLowerCase().replace(/\s+/g, '-')}`)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors inline-flex items-center" 
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {paginatedAthletes.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Tidak ada atlet yang cocok dengan filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
}
