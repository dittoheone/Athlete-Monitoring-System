import { useState, useEffect } from "react";
import api from "../../../services/api";
import { Plus, Trash2, Search } from "lucide-react";
import { useToast } from "../../../hooks/useToast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function TeamManagement() {
  const queryClient = useQueryClient();
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Manajemen Tim</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Tambah Tim Baru</h3>
        <form onSubmit={handleCreateTeam} className="flex gap-4">
          <input
            type="text"
            placeholder="Nama Tim (e.g., Persija Jakarta)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            className="flex-1 rounded-lg border-gray-300 border p-2"
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Tim
          </button>
        </form>
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
    </div>
  );
}
