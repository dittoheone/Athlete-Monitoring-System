import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { matchAPI, athleteAPI } from "../../../services/api";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "../../../hooks/useToast";

export default function MatchDetail() {
  const { id } = useParams();
  const matchId = id ? id.split('-')[0] : null;
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [matchInfo, setMatchInfo] = useState(null);
  const [stats, setStats] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    athleteId: "",
    minutesPlayed: "",
    goals: "0",
    assists: "0",
    yellowCards: "0",
    redCards: "0",
    rating: "",
  });

  useEffect(() => {
    if (matchId) {
      fetchData();
    }
  }, [matchId]);

  const fetchData = async () => {
    try {
      const [matchesRes, statsRes, athletesRes] = await Promise.all([
        matchAPI.getAll(),
        matchAPI.getStats(matchId),
        athleteAPI.getAll()
      ]);

      const match = matchesRes.data.find(m => m.id === parseInt(matchId));
      if (!match) {
        addToast("Data pertandingan tidak ditemukan", "error");
        navigate("/coach/matches");
        return;
      }

      setMatchInfo(match);
      setStats(statsRes.data);
      setAthletes(athletesRes.data);
    } catch (err) {
      console.error(err);
      addToast("Gagal memuat data", "error");
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
    if (!formData.athleteId || !formData.minutesPlayed || !formData.rating) {
      addToast("Pilih pemain, isi menit bermain, dan rating", "error");
      return;
    }

    setSaving(true);
    try {
      await matchAPI.addStat(matchId, formData);
      addToast("Statistik berhasil disimpan", "success");
      
      // Reset form
      setFormData({
        athleteId: "",
        minutesPlayed: "",
        goals: "0",
        assists: "0",
        yellowCards: "0",
        redCards: "0",
        rating: "",
      });
      
      // Refresh stats
      const statsRes = await matchAPI.getStats(matchId);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || "Gagal menyimpan statistik", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white h-12 rounded-2xl animate-pulse"></div>
        <div className="bg-white h-64 rounded-2xl animate-pulse"></div>
        <div className="bg-white h-96 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  // Filter out athletes who already have stats in this match
  const availableAthletes = athletes.filter(
    a => !stats.some(s => s.athlete_id === a.id)
  );

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <button 
          onClick={() => navigate("/coach/matches")}
          className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Input Statistik Pemain</h1>
          <p className="text-sm text-gray-500 mt-1">
            {matchInfo?.competition} • vs <span className="font-bold">{matchInfo?.opponent_name}</span> • {new Date(matchInfo?.match_date).toLocaleDateString('id-ID')}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 border-b border-gray-100 pb-3">Form Statistik Baru</h3>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Pemain</label>
            <select
              name="athleteId"
              value={formData.athleteId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white"
            >
              <option value="">-- Pilih Pemain --</option>
              {availableAthletes.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.position})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Menit Bermain</label>
            <input
              type="number"
              name="minutesPlayed"
              value={formData.minutesPlayed}
              onChange={handleInputChange}
              min="0"
              max="120"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
              placeholder="Contoh: 90"
            />
          </div>


          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Gol</label>
            <input
              type="number"
              name="goals"
              value={formData.goals}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Assist</label>
            <input
              type="number"
              name="assists"
              value={formData.assists}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 text-yellow-600">Kartu Kuning</label>
            <input
              type="number"
              name="yellowCards"
              value={formData.yellowCards}
              onChange={handleInputChange}
              min="0"
              max="2"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 text-red-600">Kartu Merah</label>
            <input
              type="number"
              name="redCards"
              value={formData.redCards}
              onChange={handleInputChange}
              min="0"
              max="1"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving || availableAthletes.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Statistik"}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Daftar Statistik Pemain di Pertandingan Ini</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Nama Pemain</th>
                <th className="px-6 py-4 text-center">Menit</th>
                <th className="px-6 py-4 text-center">Gol</th>
                <th className="px-6 py-4 text-center">Assist</th>
                <th className="px-6 py-4 text-center">Kartu (Y/R)</th>
                <th className="px-6 py-4 text-center">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.length > 0 ? (
                stats.map((stat) => (
                  <tr key={stat.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{stat.athlete_name}</td>
                    <td className="px-6 py-4 text-center">{stat.minutes_played}'</td>
                    <td className="px-6 py-4 text-center font-bold text-green-600">{stat.goals || 0}</td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">{stat.assists || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-yellow-500 font-bold">{stat.yellow_cards || 0}</span>
                      <span className="text-gray-300 mx-1">/</span>
                      <span className="text-red-500 font-bold">{stat.red_cards || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold
                        ${parseFloat(stat.rating) >= 8 ? 'bg-green-100 text-green-700' :
                          parseFloat(stat.rating) >= 6.5 ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'}`}
                      >
                        {parseFloat(stat.rating).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Belum ada statistik pemain yang diinput untuk pertandingan ini.
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
