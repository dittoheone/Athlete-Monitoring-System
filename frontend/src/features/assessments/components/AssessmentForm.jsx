import { useState, useEffect } from "react";
import { assessmentAPI } from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import { X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AssessmentForm({ isOpen, onClose, athleteId, athleteName }) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("Fisik & BIA");
  const { addToast } = useToast();

  const [formData, setFormData] = useState({});

  const { data: metricsStructure } = useQuery({
    queryKey: ['metricsStructure'],
    queryFn: () => assessmentAPI.getMetricStructure().then(res => res.data)
  });

  if (!isOpen) return null;

  const handleChange = (cat, field, value) => {
    setFormData(prev => ({
      ...prev,
      [cat]: {
        ...(prev[cat] || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!athleteId) return addToast("Terjadi kesalahan sistem: ID atlet tidak valid", "error");

    const metricsToSave = {};
    
    // Process only the active category
    if (metricsStructure && metricsStructure[category]) {
      metricsToSave[category] = {};
      metricsStructure[category].forEach(metric => {
        const val = formData[category]?.[metric];
        if (val !== undefined && val !== "") {
          metricsToSave[category][metric] = parseFloat(val);
        }
      });
    }

    if (Object.keys(metricsToSave[category] || {}).length === 0) {
      return addToast("Harap isi setidaknya satu nilai assessment", "error");
    }

    setLoading(true);
    try {
      await assessmentAPI.create({
        athleteId,
        date: new Date().toISOString().split("T")[0],
        metrics: metricsToSave,
      });

      addToast("Assessment berhasil disimpan", "success");
      setFormData({});
      onClose();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.error || "Gagal menyimpan assessment", "error");
    } finally {
      setLoading(false);
    }
  };

  const currentMetrics = metricsStructure ? metricsStructure[category] || [] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Input Assessment</h2>
            <p className="text-sm text-gray-500 mt-1">Atlet: <span className="font-semibold text-gray-700">{athleteName}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Kategori Assessment</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 bg-white shadow-sm transition-all"
            >
              {metricsStructure && Object.keys(metricsStructure).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <form id="assessment-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentMetrics.map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">{field}</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData[category]?.[field] || ""}
                      onChange={(e) => handleChange(category, field, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                      placeholder={field.includes('Detik') ? 'detik' : field.includes('Kg') ? 'kg' : field.includes('Cm') ? 'cm' : field.includes('Score') ? '0-100' : field.includes('%') ? '%' : field.includes('Jam') ? 'jam' : '1-10'}
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end space-x-3 bg-gray-50/50">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-all shadow-sm"
          >
            Batal
          </button>
          <button 
            type="submit"
            form="assessment-form"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? "Menyimpan..." : "Simpan Assessment"}
          </button>
        </div>

      </div>
    </div>
  );
}
