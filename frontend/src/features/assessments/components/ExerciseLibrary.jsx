import { useState } from "react";
import { exerciseAPI } from "../../../services/api";
import { Search, Edit2, Trash2, Plus, X } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ExerciseLibrary() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    focusArea: "",
    description: "",
    mappedMetric: "",
    frequency: "",
    intensity: "",
    timeDuration: "",
    typeFitt: "",
    sets: "",
    reps: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [exerciseToDelete, setExerciseToDelete] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToast } = useToast();

  const FILTER_CATEGORIES = ["Semua", "Cardio", "Strength", "Flexibility", "Core"];
  const FOCUS_AREAS = ["Kecepatan", "Kekuatan Kaki", "Keseimbangan", "Fleksibilitas", "Daya Tahan", "Agility"];

  const { data: exercisesData, isLoading: loading } = useQuery({
    queryKey: ['medisExercises'],
    queryFn: () => exerciseAPI.getAll().then(res => res.data)
  });

  const exercises = exercisesData || [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const createMutation = useMutation({
    mutationFn: (payload) => exerciseAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisExercises'] });
      addToast("Latihan berhasil ditambahkan", "success");
      resetForm();
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal menambahkan latihan", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => exerciseAPI.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisExercises'] });
      addToast("Latihan berhasil diperbarui", "success");
      resetForm();
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal memperbarui latihan", "error");
    }
  });

  const handleAddExercise = (e) => {
    e.preventDefault();
    const { name, type, focusArea } = formData;
    if (!name.trim() || !type.trim() || !focusArea.trim()) {
      addToast("Lengkapi semua field yang wajib", "error");
      return;
    }

    const payload = {
      name,
      type,
      focusArea,
      description: formData.description || null,
      mappedMetric: formData.mappedMetric || null,
      frequency: formData.frequency || null,
      intensity: formData.intensity || null,
      timeDuration: formData.timeDuration || null,
      typeFitt: formData.typeFitt || null,
      sets: formData.sets ? parseInt(formData.sets) : null,
      reps: formData.reps ? parseInt(formData.reps) : null,
    };

    if (isEditing) {
      updateMutation.mutate({ id: editId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const resetForm = () => {
    setFormData({ name: "", type: "", focusArea: "", description: "", mappedMetric: "", frequency: "", intensity: "", timeDuration: "", typeFitt: "", sets: "", reps: "" });
    setIsEditing(false);
    setEditId(null);
    setIsModalOpen(false);
  };

  const handleEditClick = (ex) => {
    setFormData({
      name: ex.name || "",
      type: ex.type || "",
      focusArea: ex.focus_area || "",
      description: ex.description || "",
      mappedMetric: ex.mapped_metric || "",
      frequency: ex.frequency || "",
      intensity: ex.intensity || "",
      timeDuration: ex.time_duration || "",
      typeFitt: ex.type_fitt || "",
      sets: ex.sets || "",
      reps: ex.reps || "",
    });
    setIsEditing(true);
    setEditId(ex.id);
    setIsModalOpen(true);
  };

  const confirmDeleteExercise = (ex) => {
    setExerciseToDelete(ex);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => exerciseAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medisExercises'] });
      addToast("Latihan berhasil dihapus", "success");
      setExerciseToDelete(null);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal menghapus latihan", "error");
    }
  });

  const handleDeleteConfirm = () => {
    if (!exerciseToDelete) return;
    deleteMutation.mutate(exerciseToDelete.id);
  };

  const filteredExercises = exercises.filter(
    (ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            ex.focus_area.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === "Semua" || ex.type === activeFilter;
      return matchesSearch && matchesFilter;
    }
  );

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Program Latihan & Library</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola daftar latihan yang tersedia untuk direkomendasikan kepada atlet.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-gray-900 whitespace-nowrap">Library Latihan</h3>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
              {FILTER_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                    activeFilter === cat ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari latihan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Nama Latihan</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Area Fokus</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="animate-pulse flex space-x-4 justify-center">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredExercises.length > 0 ? (
                filteredExercises.map((ex) => (
                  <tr key={ex.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{ex.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {ex.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-gray-700">{ex.focus_area}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">{ex.description || "-"}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleEditClick(ex)}
                          className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors" 
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => confirmDeleteExercise(ex)}
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
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada data latihan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {exerciseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Latihan?</h3>
              <p className="text-sm text-gray-500">
                Apakah Anda yakin ingin menghapus latihan <strong>{exerciseToDelete.name}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setExerciseToDelete(null)}
                className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm shadow-red-200"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 animate-in fade-in zoom-in duration-200 my-8">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {isEditing ? 'Edit Latihan' : 'Tambah Latihan Baru'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Latihan</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Contoh: Sprint 100m"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori Latihan</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {FILTER_CATEGORIES.filter(c => c !== "Semua").map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Area Fokus</label>
                <select
                  name="focusArea"
                  value={formData.focusArea}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Area --</option>
                  {FOCUS_AREAS.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mapped Metric (Opsional)</label>
                <input
                  type="text"
                  name="mappedMetric"
                  value={formData.mappedMetric}
                  onChange={handleInputChange}
                  placeholder="Misal: speed, balance"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Frequency</label>
                  <input
                    type="text"
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    placeholder="3x/minggu"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Intensity</label>
                  <select
                    name="intensity"
                    value={formData.intensity}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Time</label>
                  <input
                    type="text"
                    name="timeDuration"
                    value={formData.timeDuration}
                    onChange={handleInputChange}
                    placeholder="45 menit"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
                  <input
                    type="text"
                    name="typeFitt"
                    value={formData.typeFitt}
                    onChange={handleInputChange}
                    placeholder="Sprint, Stretching..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Sets</label>
                  <input
                    type="number"
                    name="sets"
                    value={formData.sets}
                    onChange={handleInputChange}
                    placeholder="3"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Reps</label>
                  <input
                    type="number"
                    name="reps"
                    value={formData.reps}
                    onChange={handleInputChange}
                    placeholder="8"
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi / Instruksi</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Instruksi singkat..."
                />
              </div>

              <div className="pt-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                >
                  {isEditing ? 'Perbarui Latihan' : 'Simpan Latihan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
