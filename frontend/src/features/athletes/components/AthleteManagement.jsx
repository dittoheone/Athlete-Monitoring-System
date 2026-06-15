import { useState } from "react";
import { athleteAPI } from "../../../services/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Plus,
  Edit3,
  Trash2,
  AlertCircle,
  MapPin,
  Calendar,
  Search,
} from "lucide-react";
import { useToast } from "../../../hooks/useToast";

const POSITION_OPTIONS = ["Striker", "Midfielder", "Defender", "Goalkeeper"];
const STATUS_OPTIONS = ["Prima", "Fit", "Pemulihan", "Rehabilitasi", "Underperform", "Cedera"];

export default function AthleteManagement() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [athleteToDelete, setAthleteToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    position: "Striker",
    status: "Fit",
  });
  const { addToast } = useToast();

  const { data: athletes, isLoading, error } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => athleteAPI.getAll().then(res => res.data)
  });

  const createMutation = useMutation({
    mutationFn: (data) => athleteAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      addToast("Atlet berhasil ditambahkan", "success");
      setIsAdding(false);
      setFormData({ name: "", position: "Striker", status: "Fit" });
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal menambahkan atlet", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => athleteAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      addToast("Data atlet berhasil diperbarui", "success");
      setEditingId(null);
      setFormData({ name: "", position: "Striker", status: "Fit" });
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal memperbarui atlet", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => athleteAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['athletes'] });
      addToast("Atlet berhasil dihapus", "success");
      setAthleteToDelete(null);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || "Gagal menghapus atlet", "error");
    }
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdd = () => {
    if (!formData.name.trim()) {
      addToast("Nama wajib diisi", "error");
      return;
    }
    createMutation.mutate({
      name: formData.name,
      position: formData.position,
    });
  };

  const handleEdit = (id) => {
    if (!formData.name.trim()) {
      addToast("Nama wajib diisi", "error");
      return;
    }
    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        position: formData.position,
        status: formData.status,
      }
    });
  };

  const executeDeleteAthlete = () => {
    if (athleteToDelete) {
      deleteMutation.mutate(athleteToDelete.id);
    }
  };

  const startEdit = (athlete) => {
    setEditingId(athlete.id);
    setFormData({
      name: athlete.name,
      position: athlete.position,
      status: athlete.status,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 bg-white rounded-lg animate-pulse border border-gray-100">
            <div className="w-1/4 h-4 mb-4 bg-gray-200 rounded"></div>
            <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const filteredAthletes = athletes?.filter(athlete => 
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    athlete.position.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manajemen Atlet
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola data atlet, posisi, dan pantau status keseluruhan mereka.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Atlet
        </button>
      </div>

      <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm mb-6 flex items-center justify-between">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari atlet berdasarkan nama atau posisi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center px-4 py-3 mb-6 text-red-700 border border-red-200 rounded-xl bg-red-50 text-sm font-medium">
          <AlertCircle className="w-5 h-5 mr-2" />
          Gagal memuat data atlet.
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="p-6 mb-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">
            Tambah Atlet Baru
          </h3>
          <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-600">
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                placeholder="Masukkan nama atlet..."
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-600">
                Posisi
              </label>
              <select
                name="position"
                value={formData.position}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
              >
                {POSITION_OPTIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setIsAdding(false);
                setFormData({ name: "", position: "Striker", status: "Fit" });
              }}
              className="px-5 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleAdd}
              disabled={createMutation.isPending}
              className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan Atlet"}
            </button>
          </div>
        </div>
      )}

      {/* Grid view for athletes */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredAthletes.map((athlete) => (
          <div
            key={athlete.id}
            className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
          >
            {/* Top right actions */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={() => startEdit(athlete)}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Edit Atlet"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAthleteToDelete(athlete)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Hapus Atlet"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start mb-4">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-lg mr-4 border border-blue-100">
                {athlete.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  {athlete.name}
                </h3>
                <span className="inline-block px-2 py-0.5 mt-1 text-[10px] font-bold tracking-wider text-blue-700 uppercase bg-blue-100 rounded">
                  {athlete.position}
                </span>
              </div>
            </div>

            {editingId === athlete.id ? (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Position</label>
                      <select
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        {POSITION_OPTIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleEdit(athlete.id)}
                    disabled={updateMutation.isPending}
                    className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-gray-50 space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-xs">
                    Assessment Terakhir:{" "}
                    <strong className="text-gray-900">
                      {athlete.last_assessment_date
                        ? new Date(athlete.last_assessment_date).toLocaleDateString("id-ID")
                        : "Belum Ada"}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Activity className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-xs">
                    Status:{" "}
                    <span
                      className={`font-bold ${
                        athlete.status === "Prima" || athlete.status === "Fit"
                          ? "text-green-600"
                          : athlete.status === "Underperform"
                          ? "text-orange-600"
                          : "text-red-600"
                      }`}
                    >
                      {athlete.status}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}

        {athletes?.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
            <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Belum ada atlet di tim ini.</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-4 px-4 py-2 text-blue-600 bg-blue-50 font-bold rounded-lg hover:bg-blue-100 transition-colors text-sm"
            >
              Tambah Atlet Pertama
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {athleteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Atlet?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin menghapus <strong>{athleteToDelete.name}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan dan semua data historis atlet akan hilang.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setAthleteToDelete(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors text-sm"
                >
                  Batal
                </button>
                <button
                  onClick={executeDeleteAthlete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm shadow-red-200 text-sm disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Activity(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
