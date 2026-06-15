import { useState, useEffect } from "react";
import { athleteAPI } from "../../../services/api";
import { Users, Eye, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import AthleteDetail from "./MedicalAthleteDetail";
import Pagination from "../../../components/common/Pagination";

const statusStyles = {
  Prima: "bg-green-100 text-green-700",
  Fit: "bg-blue-100 text-blue-700",
  Underperform: "bg-orange-100 text-orange-700",
  Rehabilitasi: "bg-yellow-100 text-yellow-700",
  Cedera: "bg-red-100 text-red-700",
};

export default function AthleteList() {
  const location = useLocation();
  const [selectedAthleteId, setSelectedAthleteId] = useState(location.state?.selectedAthleteId || null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['medisAthletes', currentPage],
    queryFn: () => athleteAPI.getAll(currentPage, limit).then(res => res.data),
    keepPreviousData: true
  });

  const athletes = data?.data || data || [];
  const totalPages = data?.totalPages || 1;
  
  const filteredAthletes = athletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4 max-w-7xl mx-auto">
        <div className="w-48 h-8 bg-gray-200 rounded animate-pulse mb-6"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white rounded-lg animate-pulse border border-gray-100"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-700 border border-red-200 rounded-lg bg-red-50 max-w-7xl mx-auto">
        {error}
      </div>
    );
  }

  if (selectedAthleteId) {
    return (
      <AthleteDetail
        athleteId={selectedAthleteId}
        onBack={() => {
          setSelectedAthleteId(null);
          // clear state if any
          if (location.state?.selectedAthleteId) {
            window.history.replaceState({}, document.title);
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Atlet</h1>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari atlet, posisi, atau status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 font-semibold">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Posisi</th>
                <th className="px-6 py-4">Status Kesiapan</th>
                <th className="px-6 py-4">Terakhir Diasses</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAthletes.map((athlete) => (
                <tr key={athlete.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{athlete.name}</td>
                  <td className="px-6 py-4">{athlete.position}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        statusStyles[athlete.status] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {athlete.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {athlete.last_assessment_date 
                      ? new Date(athlete.last_assessment_date).toLocaleDateString('id-ID') 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedAthleteId(athlete.id)}
                      className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5 mx-auto" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredAthletes.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400 opacity-50" />
                    <p>Tidak ada atlet yang cocok dengan pencarian Anda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
        />
      </div>
    </div>
  );
}
