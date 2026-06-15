import { Link } from "react-router-dom";
import { adminAPI } from "../../../services/api";
import { useQuery } from "@tanstack/react-query";
import { Users, Server, UserPlus, Database, Activity, ShieldCheck, ShieldAlert } from "lucide-react";

export default function AdminDashboard() {
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => adminAPI.getStats()
  });

  const { data: logsData, isLoading: loadingLogs } = useQuery({
    queryKey: ['adminActivityLogs'],
    queryFn: () => adminAPI.getActivityLogs()
  });

  const stats = statsData?.data || {
    totalTeams: 0,
    activeAccounts: 0,
    totalAthletes: 0,
    serverStatus: "Normal"
  };

  const activityLogs = logsData?.data?.slice(0, 5) || [];

  if (loadingStats || loadingLogs) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="bg-white h-24 rounded-2xl animate-pulse"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Administrator</h1>
          <p className="text-sm text-gray-500 mt-1">Ringkasan sistem dan log aktivitas terbaru.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Pengguna</p>
            <p className="text-2xl font-bold text-gray-900">{stats.activeAccounts}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Tim Aktif</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalTeams}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Database className="w-6 h-6 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Total Atlet</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalAthletes}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1">Status Server</p>
            <p className="text-xl font-bold text-green-600 mt-1">{stats.serverStatus}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <Server className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Aktivitas Sistem Terkini */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-indigo-600" />
              Aktivitas Sistem Terkini
            </h3>
            <Link to="/admin/logs" className="text-indigo-600 text-xs font-bold hover:text-indigo-700">Lihat Semua Log</Link>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activityLogs.map((log) => {
              const logType = log.status === "Berhasil" ? "success" : log.status === "Gagal" ? "error" : "info";
              return (
              <div key={log.id} className="flex items-start space-x-4">
                <div className="mt-1">
                  {logType === "success" && <ShieldCheck className="w-5 h-5 text-green-500" />}
                  {logType === "info" && <Activity className="w-5 h-5 text-blue-500" />}
                  {logType === "error" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{log.action}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <span className="font-semibold text-gray-700 mr-2">{log.user_name || "Sistem"} ({log.user_role || "-"})</span>
                    <span>• {new Date(log.created_at).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>

        {/* Manajemen Cepat */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Manajemen Pengguna Cepat</h3>
          </div>
          <div className="p-6 space-y-4">
            <Link 
              to="/admin/users" 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Tambah Pengguna</h4>
                  <p className="text-xs text-gray-500">Buat akun staf baru</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/admin/users" 
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
            >
              <div className="flex items-center">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                  <Database className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Kelola Tim</h4>
                  <p className="text-xs text-gray-500">Tambah atau hapus tim</p>
                </div>
              </div>
            </Link>

          </div>
        </div>

      </div>
    </div>
  );
}
