import { useState, useEffect } from "react";
import api from "../../../services/api";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { useToast } from "../../../hooks/useToast";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Pagination from "../../../components/common/Pagination";

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Semua Peran");
  const [statusFilter, setStatusFilter] = useState("all");
  const { addToast } = useToast();

  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "medis",
    teamIds: [],
    is_active: true,
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['adminUsers', currentPage],
    queryFn: () => api.get("/admin/users", { params: { page: currentPage, limit } }).then(res => res.data),
    keepPreviousData: true
  });

  const { data: teamsData, isLoading: loadingTeams } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: () => api.get("/admin/teams").then(res => res.data)
  });

  const users = usersData?.data || usersData || [];
  const teams = teamsData || [];
  const loading = loadingUsers || loadingTeams;

  const createMutation = useMutation({
    mutationFn: (data) => api.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      addToast("Akun berhasil dibuat", "success");
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to save user:", error);
      addToast("Gagal menyimpan data", "error");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      addToast("Akun berhasil diperbarui", "success");
      resetForm();
    },
    onError: (error) => {
      console.error("Failed to save user:", error);
      addToast("Gagal menyimpan data", "error");
    }
  });

  const handleCreateOrUpdateUser = async (e) => {
    e.preventDefault();
    if (editingUserId) {
      updateMutation.mutate({ id: editingUserId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      email: user.email,
      password: "", // Leave blank for now, or could just omit
      role: user.role,
      teamIds: user.teams ? user.teams.map(t => t.id) : [],
      is_active: user.is_active,
    });
    setIsAdding(true);
  };

  const confirmDeleteUser = (user) => {
    setUserToDelete(user);
  };

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      addToast("Pengguna berhasil dihapus", "success");
      setUserToDelete(null);
    },
    onError: (error) => {
      console.error("Failed to delete user:", error);
      addToast("Gagal menghapus pengguna", "error");
    }
  });

  const executeDeleteUser = () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete.id);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "medis",
      teamIds: [],
      is_active: true,
    });
    setEditingUserId(null);
    setIsAdding(false);
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "Semua Peran" || user.role === roleFilter.toLowerCase();
    
    let matchStatus = true;
    if (statusFilter === 'active') matchStatus = user.is_active === true;
    if (statusFilter === 'inactive') matchStatus = user.is_active === false;
    
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna & Hak Akses</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun staf medis dan pelatih di seluruh tim.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pengguna Baru
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-4">
            <h3 className="text-sm font-bold text-gray-900">{editingUserId ? "Edit Akun" : "Buat Akun Baru"}</h3>
            <button onClick={resetForm} className="text-sm font-bold text-gray-400 hover:text-gray-600">Batal</button>
          </div>
          <form onSubmit={handleCreateOrUpdateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alamat Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{editingUserId ? "Password Baru (Kosongkan jika tidak diubah)" : "Password Sementara"}</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                required={!editingUserId}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Peran Akses</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="medis">Tim Medis</option>
                <option value="pelatih">Pelatih</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Alokasi Tim</label>
              <select
                multiple
                value={formData.teamIds}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  teamIds: Array.from(e.target.selectedOptions, option => option.value)
                })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 h-24"
                required
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Tahan Ctrl/Cmd untuk memilih beberapa tim.</p>
            </div>
            {editingUserId && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Status Akun</label>
                <select
                  value={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="true">Aktif</option>
                  <option value="false">Nonaktif (Suspend)</option>
                </select>
              </div>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm"
              >
                {editingUserId ? "Simpan Perubahan" : "Simpan & Buat Akun"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari pengguna..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-blue-500 transition-colors"
            />
          </div>
          
          <div className="flex space-x-3">
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="Semua Peran">Semua Peran</option>
              <option value="Medis">Tim Medis</option>
              <option value="Pelatih">Pelatih</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Semua Status</option>
              <option value="active">Status Aktif</option>
              <option value="inactive">Status Nonaktif</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/50 text-xs text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Pengguna</th>
                <th className="px-6 py-4">Peran</th>
                <th className="px-6 py-4">Tim Alokasi</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center">
                    <div className="animate-pulse h-4 bg-gray-200 rounded w-1/4 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{user.name}</div>
                      <div className="text-xs text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                        ${user.role === 'medis' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md text-xs">
                        {user.teams?.length > 0 ? user.teams.map(t => t.name).join(', ') : "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => handleEditClick(user)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => confirmDeleteUser(user)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Tidak ada pengguna yang cocok dengan pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={currentPage} 
          totalPages={usersData?.totalPages || 1} 
          onPageChange={setCurrentPage} 
        />
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden transform transition-all">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Pengguna?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Apakah Anda yakin ingin menghapus <strong>{userToDelete.name}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={executeDeleteUser}
                  className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm shadow-red-200"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
