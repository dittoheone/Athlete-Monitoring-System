import { useState } from "react";
import { Search, Download, Activity, ShieldCheck, ShieldAlert, Settings } from "lucide-react";
import { generatePDFReport } from "../../../utils/pdfGenerator";
import { adminAPI } from "../../../services/api";
import { useQuery } from "@tanstack/react-query";

export default function ActivityLog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['adminActivityLogs'],
    queryFn: () => adminAPI.getActivityLogs()
  });

  const rawLogs = logsData?.data || [];

  const activityLogs = rawLogs.map(log => ({
    id: log.id,
    time: new Date(log.created_at).toLocaleString('id-ID'),
    user: `${log.user_name || "Sistem"} (${log.user_role || "-"})`,
    action: log.action,
    category: log.category,
    status: log.status,
    ip: log.ip_address || "Unknown"
  }));

  const filteredLogs = activityLogs.filter(log => {
    const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = categoryFilter === "Semua Kategori" || log.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const handleExportPDF = () => {
    const columns = ["Waktu", "Pengguna", "Aktivitas", "Kategori", "Status", "IP Address"];
    const data = filteredLogs.map(log => [
      log.time,
      log.user,
      log.action,
      log.category,
      log.status,
      log.ip
    ]);

    generatePDFReport(
      "Laporan Log Aktivitas Sistem",
      columns,
      data,
      "laporan_log_aktivitas.pdf"
    );
  };

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Log Aktivitas Sistem</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau seluruh aktivitas pengguna dan riwayat keamanan.</p>
        </div>
        <button 
          onClick={handleExportPDF}
          className="flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-bold shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Log (PDF)
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari log aktivitas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex space-x-3">
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Semua Kategori">Semua Kategori</option>
              <option value="Aktivitas">Aktivitas</option>
              <option value="Sistem">Sistem</option>
              <option value="Keamanan">Keamanan</option>
            </select>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Waktu</th>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Aktivitas</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {log.time}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {log.user}
                    </td>
                    <td className="px-6 py-4">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs font-semibold">
                        {log.category === "Keamanan" && <ShieldCheck className="w-3.5 h-3.5 text-purple-500 mr-1.5" />}
                        {log.category === "Sistem" && <Settings className="w-3.5 h-3.5 text-blue-500 mr-1.5" />}
                        {log.category === "Aktivitas" && <Activity className="w-3.5 h-3.5 text-green-500 mr-1.5" />}
                        {log.category}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider
                        ${log.status === 'Berhasil' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs text-gray-400">
                      {log.ip}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada log aktivitas yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
