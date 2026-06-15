import { useState, useEffect } from "react";
import api from "../../../services/api";
import { Plus, Trash2, Search } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function TeamManagement() {
  const queryClient = useQueryClient();
  const [isAddingModalOpen, setIsAddingModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { addToast } = useToast();

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['adminTeams'],
    queryFn: () => api.get("/admin/teams").then(res => res.data)
  });
  const teams = teamsData || [];

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (name) => api.post("/admin/teams", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      setNewTeamName("");
      setIsAddingModalOpen(false);
      addToast("Tim berhasil ditambahkan", "success");
    },
    onError: (error) => {
      console.error("Failed to create team:", error);
      addToast("Gagal menambahkan tim", "error");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminTeams'] });
      addToast("Tim berhasil dihapus", "success");
    },
    onError: (error) => {
      console.error("Failed to delete team:", error);
      addToast("Gagal menghapus tim", "error");
    }
  });

  const handleCreateTeam = (e) => {
    e.preventDefault();
    if (!newTeamName) return;
    createMutation.mutate(newTeamName);
  };

  const handleDeleteTeam = (id) => {
    if (!window.confirm("Hapus tim ini? Semua data terkait akan terhapus.")) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Manajemen Tim</h2>
        <button
          onClick={() => setIsAddingModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Tim
        </button>
      </div>


      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari tim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-sm font-medium text-gray-500">Nama Tim</th>
              <th className="px-6 py-4 text-sm font-medium text-gray-500">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredTeams.map((team) => (
              <tr key={team.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">{team.name}</td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredTeams.length === 0 && (
              <tr>
                <td colSpan="2" className="px-6 py-8 text-center text-gray-500">
                  Tidak ada tim yang cocok dengan pencarian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Team Modal */}
      {isAddingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Tambah Tim Baru</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Tim</label>
                <input
                  type="text"
                  placeholder="e.g., Persija Jakarta"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Menyimpan...' : 'Simpan Tim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
