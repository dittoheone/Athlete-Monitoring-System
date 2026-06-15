import { useState } from "react";
import { athleteAPI, injuryAPI } from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import { Edit2, Trash2, Plus, X, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Pagination from "../../../components/common/Pagination";

export default function InjuryManagement() {
  const queryClient = useQueryClient();
  const [loadingAction, setLoadingAction] = useState(false);
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    athleteId: "",
    date: new Date().toISOString().split("T")[0],
    injuryType: "",
    severityLevel: "Ringan",
    status: "Masa Penyembuhan",
    estimatedRecovery: "",
    notes: "",
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: athletesData } = useQuery({
    queryKey: ['medisAthletes'],
    queryFn: () => athleteAPI.getAll().then(res => res.data)
  });

  const { data, isLoading } = useQuery({
    queryKey: ['medisInjuries', currentPage],
    queryFn: () => injuryAPI.getAll(currentPage, limit).then(res => res.data),
    keepPreviousData: true
  });

  const athletes = athletesData || [];
  const injuries = data?.data || data || [];
  const totalPages = data?.totalPages || 1;

  const filteredInjuries = injuries.filter(inj => 
    inj.athlete_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inj.injury_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inj.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inj.severity_level?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEdit = (injury) => {
    setEditingId(injury.id);
    setFormData({
      athleteId: injury.athlete_id,
      date: new Date(injury.date).toISOString().split("T")[0],
      injuryType: injury.injury_type,
      severityLevel: injury.severity_level,
      status: injury.status,
      estimatedRecovery: injury.estimated_recovery || "",
      notes: injury.notes || "",
    });
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data) => injuryAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisInjuries'] });
      addToast("Catatan cedera berhasil disimpan", "success");
      handleCloseModal();
    },
    onError: (err) => {
      console.error(err);
      addToast("Gagal menyimpan catatan cedera", "error");
    },
    onSettled: () => setLoadingAction(false)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => injuryAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisInjuries'] });
      addToast("Status cedera berhasil diperbarui", "success");
      handleCloseModal();
    },
    onError: (err) => {
      console.error(err);
      addToast("Gagal memperbarui catatan cedera", "error");
    },
    onSettled: () => setLoadingAction(false)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => injuryAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisInjuries'] });
      addToast("Catatan cedera berhasil dihapus", "success");
    },
    onError: (err) => {
      console.error(err);
      addToast("Gagal menghapus catatan", "error");
    }
  });

  const handleCloseModal = () => {
    setEditingId(null);
    setFormData({
      athleteId: "",
      date: new Date().toISOString().split("T")[0],
      injuryType: "",
      severityLevel: "Ringan",
      status: "Masa Penyembuhan",
      estimatedRecovery: "",
      notes: "",
    });
    setIsModalOpen(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.athleteId || !formData.injuryType || !formData.severityLevel) {
      addToast("Lengkapi form dengan benar", "error");
      return;
    }

    setLoadingAction(true);
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          status: formData.status,
          notes: formData.notes
        }
      });
    } else {
      createMutation.mutate({
        athleteId: formData.athleteId,
        date: formData.date,
        injuryType: formData.injuryType,
        severityLevel: formData.severityLevel,
        status: formData.status,
        estimatedRecovery: formData.estimatedRecovery,
        notes: formData.notes,
      });
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus catatan cedera ini?")) return;
    deleteMutation.mutate(id);
  };

  const statusColors = {
    "Masa Penyembuhan": "bg-yellow-100 text-yellow-700",
    "Sudah Sembuh": "bg-green-100 text-green-700",
    "Dalam Pantauan": "bg-blue-100 text-blue-700",
    "Aktif": "bg-red-100 text-red-700"
  };

  const severityColors = {
    "Ringan": "text-green-600 bg-green-50 px-2 py-0.5 rounded",
    "Sedang": "text-orange-600 bg-orange-50 px-2 py-0.5 rounded",
    "Berat": "text-red-600 bg-red-50 px-2 py-0.5 rounded",
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({
      athleteId: "",
      date: new Date().toISOString().split("T")[0],
      injuryType: "",
      severityLevel: "Ringan",
      status: "Masa Penyembuhan",
      estimatedRecovery: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto font-sans">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Cedera</h1>
        <button
          onClick={handleOpenModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Cedera
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-sm font-bold text-gray-900">Daftar Atlet Cedera</h3>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, jenis cedera, status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">Nama Atlet</th>
                    <th className="px-6 py-4">Tanggal Kejadian</th>
                    <th className="px-6 py-4">Lokasi</th>
                    <th className="px-6 py-4">Tingkat Keparahan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInjuries.map((inj) => (
                    <tr key={inj.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{inj.athlete_name}</td>
                      <td className="px-6 py-4">{new Date(inj.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4">{inj.injury_type}</td>
                      <td className="px-6 py-4 font-medium">
                        <span className={severityColors[inj.severity_level] || ""}>
                          {inj.severity_level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${statusColors[inj.status] || "bg-gray-100 text-gray-700"}`}>
                          {inj.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => handleEdit(inj)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" 
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(inj.id)}
                            className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors" 
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInjuries.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada catatan cedera yang cocok dengan pencarian.
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

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Catatan Cedera" : "Tambah Catatan Cedera Baru"}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="injuryForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Atlet</label>
                  <select
                    value={formData.athleteId}
                    onChange={(e) => handleInputChange("athleteId", e.target.value)}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="">-- Pilih Atlet --</option>
                    {athletes.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Kejadian</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Lokasi Cedera</label>
                  <input
                    type="text"
                    placeholder="Contoh: Lutut Kanan, Ankle Kiri"
                    value={formData.injuryType}
                    onChange={(e) => handleInputChange("injuryType", e.target.value)}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tingkat Keparahan</label>
                  <select
                    value={formData.severityLevel}
                    onChange={(e) => handleInputChange("severityLevel", e.target.value)}
                    disabled={!!editingId}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  >
                    <option value="Ringan">Ringan</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Berat">Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status Saat Ini</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Masa Penyembuhan">Masa Penyembuhan</option>
                    <option value="Dalam Pantauan">Dalam Pantauan</option>
                    <option value="Sudah Sembuh">Sudah Sembuh</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estimasi Pemulihan (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: 2 Minggu"
                    value={formData.estimatedRecovery}
                    onChange={(e) => handleInputChange("estimatedRecovery", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi / Catatan</label>
                  <textarea
                    rows="3"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Catatan tambahan..."
                  ></textarea>
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="injuryForm"
                disabled={loadingAction}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingAction ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
