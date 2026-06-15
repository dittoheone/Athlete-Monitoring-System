import { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import { Database, Shield, Users, HardDrive, Lock, Plus, Activity, UploadCloud } from "lucide-react";
import { useToast } from "../../../hooks/useToast";

export default function SystemSettings() {
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTeamName, setNewTeamName] = useState("");
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, statsRes] = await Promise.all([
        api.get("/admin/teams"),
        api.get("/admin/stats")
      ]);
      setTeams(teamsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      addToast("Gagal memuat pengaturan sistem", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) return;
    try {
      await api.post("/admin/teams", { name: newTeamName });
      setNewTeamName("");
      setIsAddingTeam(false);
      addToast("Tim berhasil ditambahkan", "success");
      fetchData();
    } catch (error) {
      console.error("Failed to create team:", error);
      addToast("Gagal menambahkan tim", "error");
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await api.get("/admin/backup", { responseType: 'blob' });
      
      // Create object URL for the blob
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `ams_backup_${dateStr}.json`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      addToast("Backup database berhasil diunduh", "success");
    } catch (error) {
      console.error("Backup error:", error);
      addToast("Gagal melakukan backup", "error");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm(`Apakah Anda yakin ingin memulihkan database menggunakan file ${file.name}?`)) {
      e.target.value = ''; // Reset input
      return;
    }

    setIsRestoring(true);
    const formData = new FormData();
    formData.append('backup', file);

    try {
      await api.post("/admin/restore", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      addToast("Database berhasil dipulihkan", "success");
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Restore error:", error);
      addToast("Gagal memulihkan database", "error");
    } finally {
      setIsRestoring(false);
      e.target.value = ''; // Reset input
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white h-96 rounded-2xl animate-pulse border border-gray-100"></div>
          <div className="bg-white h-96 rounded-2xl animate-pulse border border-gray-100"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-sm text-gray-500 mt-1">Konfigurasi database, keamanan, dan manajemen tim.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Konfigurasi Sistem */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <Database className="w-4 h-4 mr-2 text-blue-600" />
                Konfigurasi Database
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Status Koneksi</p>
                  <p className="text-xs text-gray-500">Koneksi Database Primary</p>
                </div>
                <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                  Terhubung
                </span>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
                <button 
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="flex-1 py-2.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-bold shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  <HardDrive className="w-4 h-4 mr-2 text-blue-600" />
                  {isBackingUp ? "Memproses..." : "Unduh Backup"}
                </button>
                <input 
                  type="file" 
                  accept=".json" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <button 
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                  className="flex-1 py-2.5 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold shadow-sm flex items-center justify-center disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4 mr-2 text-blue-600" />
                  {isRestoring ? "Memulihkan..." : "Restore Data"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <Shield className="w-4 h-4 mr-2 text-indigo-600" />
                Keamanan Sistem
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-gray-900">Sesi Aktif</p>
                  <p className="text-xs text-gray-500">Pengguna yang login dalam 15 menit terakhir</p>
                </div>
                <p className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
                  {stats?.activeSessions || 0} Pengguna
                </p>
              </div>
              <div className="pt-2">
                <button 
                  className="w-full py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-bold shadow-sm flex items-center justify-center"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Paksa Keluar Semua Sesi (Maintanance)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Manajemen Tim */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 flex items-center">
              <Users className="w-4 h-4 mr-2 text-green-600" />
              Pengaturan Tim
            </h3>
            {!isAddingTeam && (
              <button 
                onClick={() => setIsAddingTeam(true)}
                className="text-green-600 hover:text-green-700 text-sm font-bold flex items-center bg-green-50 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" /> Tambah Tim
              </button>
            )}
          </div>
          
          <div className="p-6 space-y-4 flex-1">
            {isAddingTeam && (
              <form onSubmit={handleCreateTeam} className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-inner mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-900">Tambah Tim Baru</h4>
                  <button type="button" onClick={() => setIsAddingTeam(false)} className="text-xs font-bold text-gray-500 hover:text-gray-700">Tutup</button>
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Nama Tim (e.g. Tim U-20)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold transition-colors">
                    Simpan
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {teams.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm font-medium bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Belum ada tim yang ditambahkan.
                </div>
              ) : (
                teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-green-500 transition-colors shadow-sm">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mr-4 border border-green-100">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{team.name}</h4>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">ID: {team.id}</p>
                      </div>
                    </div>
                    <div className="text-gray-400">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
