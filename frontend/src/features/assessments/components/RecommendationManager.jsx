import { useState, useEffect } from "react";
import { teamAPI, assessmentAPI } from "../../../services/api";
import { useQuery } from "@tanstack/react-query";
import { Search, Edit2, Trash2 } from "lucide-react";
import { useToast } from "../../../hooks/useToast";

export default function RecommendationManager() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    metricName: "InBody Score",
    operator: "<",
    value: "70",
    priority: "2",
    recommendationText: "",
  });
  
  const { addToast } = useToast();

  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await teamAPI.getRecommendationRules();
      setRules(response.data.sort((a, b) => a.priority - b.priority));
    } catch (err) {
      addToast("Failed to load recommendation rules", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (rule) => {
    setEditingId(rule.id);
    let metricName = "", operator = ">", value = "";
    try {
      const cond = JSON.parse(rule.trigger_condition);
      if (cond.metricName) {
        // New structured format
        metricName = cond.metricName;
        operator = cond.operator;
        value = cond.value;
      } else {
        // Old legacy format fallback
        metricName = Object.keys(cond)[0] || "";
        const expr = cond[metricName] || "";
        if (expr) {
          const match = expr.match(/([<>=]+)\s*([\d.]+)/);
          if (match) {
            operator = match[1];
            value = match[2];
          } else {
            const ops = ["<=", ">=", "<", ">", "="];
            const foundOp = ops.find(o => expr.startsWith(o));
            if (foundOp) {
              operator = foundOp;
              value = expr.replace(foundOp, "").trim();
            }
          }
        }
      }
    } catch(e) {}
    
    setFormData({
      metricName,
      operator,
      value,
      priority: rule.priority,
      recommendationText: rule.recommendation_text
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!formData.metricName || !formData.value || !formData.recommendationText) {
      addToast("Lengkapi semua field yang wajib", "error");
      return;
    }

    // Convert visual builder to structured JSON format
    const triggerCondition = JSON.stringify({
      metricName: formData.metricName,
      operator: formData.operator,
      value: formData.value
    });

    setSaving(true);
    try {
      if (editingId) {
        await teamAPI.updateRecommendationRule(
          editingId,
          parseInt(formData.priority),
          triggerCondition,
          formData.recommendationText
        );
        addToast("Aturan berhasil diperbarui", "success");
      } else {
        await teamAPI.createRecommendationRule(
          parseInt(formData.priority),
          triggerCondition,
          formData.recommendationText
        );
        addToast("Aturan berhasil disimpan", "success");
      }
      
      fetchRules();
      setEditingId(null);
      setFormData({
        metricName: "InBody Score",
        operator: "<",
        value: "70",
        priority: "2",
        recommendationText: "",
      });
    } catch (err) {
      addToast(err.response?.data?.error || "Gagal menyimpan aturan", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus aturan rekomendasi ini?")) return;
    try {
      await teamAPI.deleteRecommendationRule(id);
      addToast("Aturan berhasil dihapus", "success");
      fetchRules();
    } catch (err) {
      console.error(err);
      addToast("Gagal menghapus aturan", "error");
    }
  };

  const filteredRules = rules.filter(
    (rule) =>
      rule.trigger_condition.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rule.recommendation_text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 1:
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Tinggi (1)</span>;
      case 2:
        return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Sedang (2)</span>;
      case 3:
      default:
        return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Rendah (3)</span>;
    }
  };

  // Convert JSON to readable text for display
  const formatTriggerCondition = (jsonStr) => {
    try {
      const cond = JSON.parse(jsonStr);
      if (cond.metricName) {
        return `Jika ${cond.metricName} ${cond.operator} ${cond.value}`;
      } else {
        // Old legacy format
        return Object.entries(cond).map(([metric, expr]) => `Jika ${metric} ${expr}`).join(" DAN ");
      }
    } catch (e) {
      return jsonStr;
    }
  };

  const { data: metricsData } = useQuery({
    queryKey: ['metricsStructure'],
    queryFn: () => assessmentAPI.getMetricStructure().then(res => res.data)
  });
  
  // Flatten the metrics structure into a single array
  const METRIC_OPTIONS = metricsData 
    ? Object.values(metricsData).flat() 
    : [];

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rekomendasi Tindakan (Knowledge Base)</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola aturan basis pengetahuan untuk sistem rekomendasi otomatis berdasarkan kondisi atlet.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Add Form Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="text-sm font-bold text-gray-900 mb-6 border-b border-gray-100 pb-4">
              {editingId ? "Edit Aturan Rekomendasi" : "Tambah Aturan Baru"}
            </h3>
            <form onSubmit={handleSaveRule} className="space-y-4">
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3 mb-4">
                <p className="text-xs font-bold text-blue-800 mb-2">Kondisi Trigger (Pemicu)</p>
                
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Metrik Assessment</label>
                  <select
                    value={formData.metricName}
                    onChange={(e) => handleInputChange("metricName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white"
                  >
                    {METRIC_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex space-x-2">
                  <div className="w-1/3">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Operator</label>
                    <select
                      value={formData.operator}
                      onChange={(e) => handleInputChange("operator", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white font-mono"
                    >
                      <option value="<">&lt; (Kurang Dari)</option>
                      <option value="<=">&le; (Maksimal)</option>
                      <option value="=">= (Sama Dengan)</option>
                      <option value=">=">&ge; (Minimal)</option>
                      <option value=">">&gt; (Lebih Dari)</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Nilai Batas</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.value}
                      onChange={(e) => handleInputChange("value", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 bg-white"
                      placeholder="e.g. 70"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prioritas Rekomendasi</label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleInputChange("priority", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="1">1 (Prioritas Tinggi - Mendesak)</option>
                  <option value="2">2 (Prioritas Sedang)</option>
                  <option value="3">3 (Prioritas Rendah - Pencegahan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Teks Instruksi / Rekomendasi</label>
                <textarea
                  value={formData.recommendationText}
                  onChange={(e) => handleInputChange("recommendationText", e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Instruksi atau tindakan medis yang direkomendasikan jika kondisi pemicu terpenuhi..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                >
                  {saving ? "Menyimpan..." : "Simpan Aturan"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Rules Table Card */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Daftar Aturan Rekomendasi</h3>
              
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari aturan atau kondisi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 w-24">Prioritas</th>
                    <th className="px-6 py-4 w-48">Kondisi Trigger</th>
                    <th className="px-6 py-4">Rekomendasi Tindakan</th>
                    <th className="px-6 py-4 text-center w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center">
                        <div className="animate-pulse flex space-x-4 justify-center">
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRules.length > 0 ? (
                    filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          {getPriorityBadge(rule.priority)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-xs text-blue-800 bg-blue-50 p-2 rounded border border-blue-100 max-h-20 overflow-y-auto">
                            {formatTriggerCondition(rule.trigger_condition)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-800">
                          {rule.recommendation_text}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(rule.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" 
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada aturan rekomendasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
