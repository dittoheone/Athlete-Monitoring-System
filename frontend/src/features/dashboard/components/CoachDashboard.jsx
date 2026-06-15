import { useState, useEffect } from "react";
import { dashboardAPI, matchAPI, scheduleAPI } from "../../../services/api";
import { Trophy, Star, AlertCircle, Calendar, Medal } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { addToast } = useToast();

  const { data: teamStats, isLoading: loadingOverview } = useQuery({
    queryKey: ['teamOverview'],
    queryFn: () => dashboardAPI.getTeamOverview().then(res => res.data)
  });

  const { data: matches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchAPI.getAll().then(res => res.data)
  });

  const { data: schedules = [], isLoading: loadingSchedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => scheduleAPI.getAll().then(res => res.data)
  });

  const loading = loadingOverview || loadingMatches || loadingSchedules;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white h-24 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white h-80 rounded-2xl animate-pulse"></div>
          <div className="lg:col-span-1 bg-white h-80 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  const injuredCount = teamStats?.statusDistribution?.Cedera || 0;
  
  // Real data for match statistics
  const chartData = [...matches]
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date)) // sort chronologically for chart
    .slice(-5) // last 5 matches
    .map(m => ({
      name: `vs ${m.opponent_name}`,
      rating: parseFloat(m.average_rating) || 0,
      goals: parseInt(m.total_goals) || 0,
    }));

  // Calculate overall team average rating
  const overallAvgRating = matches.length > 0
    ? (matches.reduce((sum, m) => sum + (parseFloat(m.average_rating) || 0), 0) / matches.length).toFixed(1)
    : "0.0";
    
  // Find nearest schedule (future date)
  const now = new Date();
  const futureSchedules = schedules.filter(s => new Date(s.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date));
  const nearestSchedule = futureSchedules.length > 0 ? futureSchedules[0] : null;

  // Top athletes sorted by SPK Score
  const topAthletes = [...(teamStats?.athletes || [])]
    .sort((a, b) => (b.spkScore || 0) - (a.spkScore || 0))
    .slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Pelatih</h1>
        <p className="text-sm text-gray-500 mt-1">Ringkasan performa tim dan jadwal pertandingan.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Pertandingan</p>
            <p className="text-2xl font-bold text-gray-900">{matches.length}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Trophy className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Rata-rata Rating Tim</p>
            <p className="text-2xl font-bold text-gray-900">{overallAvgRating}</p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
            <Star className="w-6 h-6 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Pemain Cedera</p>
            <p className="text-2xl font-bold text-red-600">{injuredCount}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Jadwal Terdekat</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{nearestSchedule ? nearestSchedule.title : "Tidak Ada"}</p>
            <p className="text-xs text-gray-500">{nearestSchedule ? new Date(nearestSchedule.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-gray-900">Statistik Pertandingan Terakhir</h3>
          </div>
          
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f9fafb' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="rating" name="Rating Tim" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="goals" name="Gol" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Athletes Table */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Peringkat Performa Atlet</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3">Rank</th>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topAthletes.map((athlete, index) => (
                  <tr key={athlete.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex justify-center">
                        {index === 0 && <Medal className="w-5 h-5 text-yellow-500" />}
                        {index === 1 && <Medal className="w-5 h-5 text-gray-400" />}
                        {index === 2 && <Medal className="w-5 h-5 text-amber-600" />}
                        {index > 2 && <span className="font-bold text-gray-400">{index + 1}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{athlete.name}</div>
                      <div className="text-[10px] text-gray-500">{athlete.position}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="font-bold text-indigo-600">
                        {athlete.spkScore ? parseFloat(athlete.spkScore).toFixed(1) : "0.0"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
