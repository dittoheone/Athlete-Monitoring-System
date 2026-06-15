import { useState, useEffect } from "react";
import { settingsAPI, assessmentAPI } from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SPKSettings() {
  const [activePosition, setActivePosition] = useState("Striker");
  const [localStandards, setLocalStandards] = useState([]);
  const [localSettings, setLocalSettings] = useState({
    weight_fisik: 40,
    weight_bia: 25,
    weight_mental: 20,
    weight_tidur: 15,
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const POSITIONS = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
  
  const { data: metricsData } = useQuery({
    queryKey: ['metricsStructure'],
    queryFn: () => assessmentAPI.getMetricStructure().then(res => res.data)
  });
  const METRICS = metricsData ? metricsData["Fisik & BIA"] || [] : [];

  const { data: serverSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings().then(res => res.data)
  });

  const { data: serverStandards } = useQuery({
    queryKey: ['standards'],
    queryFn: () => settingsAPI.getStandards().then(res => res.data)
  });

  // Sync local state when server data loads
  useEffect(() => {
    if (serverSettings) {
      setLocalSettings({
        weight_fisik: serverSettings.weight_fisik * 100,
        weight_bia: serverSettings.weight_bia * 100,
        weight_mental: serverSettings.weight_mental * 100,
        weight_tidur: serverSettings.weight_tidur * 100,
      });
    }
  }, [serverSettings]);

  useEffect(() => {
    if (serverStandards) {
      setLocalStandards(serverStandards);
    }
  }, [serverStandards]);

  const getStandardValue = (position, metricName) => {
    const std = localStandards.find(s => s.position === position && s.metric_name === metricName);
    return std ? std.standard_value : "";
  };

  const handleStandardChange = (metricName, value) => {
    const newStandards = [...localStandards];
    const index = newStandards.findIndex(s => s.position === activePosition && s.metric_name === metricName);
    
    if (index >= 0) {
      newStandards[index].standard_value = parseFloat(value) || 0;
    } else {
      newStandards.push({
        position: activePosition,
        metric_name: metricName,
        standard_value: parseFloat(value) || 0
      });
    }
    setLocalStandards(newStandards);
  };

  const handleSaveStandards = async () => {
    setLoading(true);
    try {
      const promises = localStandards
        .filter(s => s.position === activePosition)
        .map(s => settingsAPI.updateStandard({
          position: s.position,
          metricName: s.metric_name,
          standardValue: s.standard_value
        }));
      
      await Promise.all(promises);
      addToast("Standar fisik berhasil disimpan", "success");
      queryClient.invalidateQueries({ queryKey: ['standards'] });
    } catch (err) {
      console.error(err);
      addToast("Gagal menyimpan standar fisik", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWeights = async () => {
    const total = localSettings.weight_fisik + localSettings.weight_bia + localSettings.weight_mental + localSettings.weight_tidur;
    if (total !== 100) {
      addToast(`Total bobot harus 100% (Saat ini: ${total}%)`, "error");
      return;
    }

    setLoading(true);
    try {
      await settingsAPI.updateSettings({
        weightFisik: localSettings.weight_fisik / 100,
        weightBia: localSettings.weight_bia / 100,
        weightMental: localSettings.weight_mental / 100,
        weightTidur: localSettings.weight_tidur / 100,
      });
      addToast("Bobot AHP berhasil disimpan", "success");
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (err) {
      console.error(err);
      addToast("Gagal menyimpan bobot AHP", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan SPK (Sistem Pendukung Keputusan)</h1>
        <p className="text-sm text-gray-500 mt-1">Atur standar minimal dan bobot kriteria untuk perhitungan SPK.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Standar Fisik & BIA */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-6">Standar Fisik & BIA</h3>
          
          <div className="flex space-x-2 mb-6 border-b border-gray-100 pb-2">
            {POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setActivePosition(pos)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-colors ${
                  activePosition === pos 
                    ? "bg-blue-100 text-blue-700" 
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600 mb-6">
              <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Kriteria Fisik</th>
                  <th className="px-4 py-3 w-40">Standar Minimal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {METRICS.map((metric) => (
                  <tr key={metric}>
                    <td className="px-4 py-3">{metric}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={getStandardValue(activePosition, metric)}
                        onChange={(e) => handleStandardChange(metric, e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSaveStandards}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 mt-auto"
          >
            Simpan Standar
          </button>
        </div>

        {/* Right Card: Bobot Kriteria (AHP) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
          <h3 className="text-sm font-bold text-gray-900 mb-2">Bobot Kriteria (AHP)</h3>
          <p className="text-xs text-gray-500 mb-6">Atur bobot prioritas untuk setiap aspek penilaian.</p>
          
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-700">Fisik & BIA (%)</label>
                <span className="text-xs font-bold text-blue-600">{localSettings.weight_fisik}%</span>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={localSettings.weight_fisik}
                onChange={(e) => setLocalSettings({...localSettings, weight_fisik: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-700">BIA (%)</label>
                <span className="text-xs font-bold text-blue-600">{localSettings.weight_bia}%</span>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={localSettings.weight_bia}
                onChange={(e) => setLocalSettings({...localSettings, weight_bia: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-700">Mental (%)</label>
                <span className="text-xs font-bold text-blue-600">{localSettings.weight_mental}%</span>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={localSettings.weight_mental}
                onChange={(e) => setLocalSettings({...localSettings, weight_mental: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-semibold text-gray-700">Tidur (%)</label>
                <span className="text-xs font-bold text-blue-600">{localSettings.weight_tidur}%</span>
              </div>
              <input
                type="range"
                min="0" max="100"
                value={localSettings.weight_tidur}
                onChange={(e) => setLocalSettings({...localSettings, weight_tidur: parseInt(e.target.value)})}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="p-4 bg-blue-50/50 rounded-xl flex justify-between items-center mt-6">
              <span className="text-sm font-bold text-gray-900">Total Bobot</span>
              <span className={`text-sm font-bold ${
                (localSettings.weight_fisik + localSettings.weight_bia + localSettings.weight_mental + localSettings.weight_tidur) === 100 
                ? "text-green-600" 
                : "text-red-600"
              }`}>
                {localSettings.weight_fisik + localSettings.weight_bia + localSettings.weight_mental + localSettings.weight_tidur}%
              </span>
            </div>
          </div>

          <button
            onClick={handleSaveWeights}
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 mt-6"
          >
            Simpan Bobot
          </button>
        </div>

      </div>
    </div>
  );
}
