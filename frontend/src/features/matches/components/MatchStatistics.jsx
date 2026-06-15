import { useState, useEffect } from "react";
import { matchAPI } from "../../../services/api";
import { Plus, Eye } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { useNavigate } from "react-router-dom";

export default function MatchStatistics() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    opponentName: "",
    matchDate: new Date().toISOString().split("T")[0],
    venue: "Kandang",
    competition: "Liga 1",
    resultStatus: "W",
    score: "",
  });

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await matchAPI.getAll();
      setMatches(response.data);
    } catch (err) {
      console.error(err);
      addToast("Gagal memuat data pertandingan", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.opponentName || !formData.matchDate) {
      addToast("Nama lawan dan tanggal harus diisi", "error");
      return;
    }

    setSaving(true);
    try {
      await matchAPI.create(formData);
      addToast("Pertandingan berhasil ditambahkan", "success");
      setIsAdding(false);
      setFormData({
        opponentName: "",
        matchDate: new Date().toISOString().split("T")[0],
        venue: "Kandang",
        competition: "Liga 1",
        resultStatus: "W",
        score: "",
      });
      fetchMatches();
    } catch (err) {
      console.error(err);
      addToast("Gagal menyimpan pertandingan", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Statistik Pertandingan</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data pertandingan dan statistik pemain.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Data Pertandingan Baru
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
            <h3 className="text-sm font-bold text-gray-900">Tambah Pertandingan Baru</h3>
            <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">Batal</button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lawan</label>
              <input
                type="text"
                name="opponentName"
                value={formData.opponentName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                placeholder="Contoh: Persib Bandung"
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Pertandingan</label>
              <input
                type="date"
                name="matchDate"
                value={formData.matchDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tempat (Venue)</label>
              <select
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="Kandang">Kandang (Home)</option>
                <option value="Tandang">Tandang (Away)</option>
                <option value="Netral">Netral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kompetisi</label>
              <input
                type="text"
                name="competition"
                value={formData.competition}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                placeholder="Contoh: Liga 1, Piala Presiden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Hasil (W/D/L)</label>
              <select
                name="resultStatus"
                value={formData.resultStatus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="W">Menang (W)</option>
                <option value="D">Seri (D)</option>
                <option value="L">Kalah (L)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Skor Pertandingan</label>
              <input
                type="text"
                name="score"
                value={formData.score}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                placeholder="Contoh: 2-1"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Data Pertandingan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Matches List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Daftar Pertandingan</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Lawan</th>
                <th className="px-6 py-4">Kompetisi</th>
                <th className="px-6 py-4 text-center">Hasil</th>
                <th className="px-6 py-4 text-center">Skor</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
                  </td>
                </tr>
              ) : matches.length > 0 ? (
                matches.map((match) => (
                  <tr key={match.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {new Date(match.match_date).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{match.opponent_name}</td>
                    <td className="px-6 py-4 text-xs">{match.competition}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 inline-flex items-center justify-center rounded-full text-xs font-bold text-white
                        ${(match.result_status === 'W' || match.result_status === 'Menang') ? 'bg-green-500' : 
                          (match.result_status === 'D' || match.result_status === 'Seri') ? 'bg-gray-400' : 
                          (match.result_status === 'L' || match.result_status === 'Kalah') ? 'bg-red-500' : 
                          'bg-blue-500'}`}
                      >
                        {match.result_status === 'W' ? 'Menang' : 
                         match.result_status === 'D' ? 'Seri' : 
                         match.result_status === 'L' ? 'Kalah' : 
                         match.result_status === 'Selesai' ? 'Menang' : 
                         match.result_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold font-mono tracking-widest text-gray-900">
                      {match.score || "-"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => navigate(`/coach/matches/${match.id}-vs-${match.opponent_name.toLowerCase().replace(/\s+/g, '-')}`)}
                        className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center text-xs font-bold" 
                        title="Lihat Detail & Input Statistik Pemain"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Detail Stats
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Belum ada data pertandingan.
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
