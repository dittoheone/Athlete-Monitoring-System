import React, { useState, useEffect } from "react";
import { Recycle, RotateCcw, AlertCircle, RefreshCw, Search } from "lucide-react";
import { recycleBinAPI } from "../../../services/api";

const RecycleBin = ({ addToast }) => {
  const [activeTab, setActiveTab] = useState("athletes");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const tabs = [
    { id: "athletes", label: "Atlet" },
    { id: "users", label: "Pengguna" },
    { id: "teams", label: "Tim" },
    { id: "injuries", label: "Cedera" },
    { id: "exercises", label: "Program Latihan" },
    { id: "schedules", label: "Jadwal" },
  ];

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await recycleBinAPI.getItems(activeTab);
      setItems(response.data);
    } catch (error) {
      console.error(error);
      addToast("Gagal memuat data Recycle Bin", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const handleRestore = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin memulihkan item ini?")) return;
    try {
      await recycleBinAPI.restoreItem(activeTab, id);
      addToast("Item berhasil dipulihkan", "success");
      fetchItems();
    } catch (error) {
      console.error(error);
      addToast("Gagal memulihkan item", "error");
    }
  };

  const filteredItems = items.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.detail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.team_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.deleted_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Recycle className="w-6 h-6 text-blue-600" />
            Recycle Bin
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Pulihkan data yang telah dihapus (Soft Delete) dari seluruh sistem.
          </p>
        </div>
        <button
          onClick={fetchItems}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
          Segarkan
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-100 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 bg-blue-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, detail, tim, atau nama penghapus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Recycle className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm">Tidak ada item di Recycle Bin untuk kategori ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs text-gray-500 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Nama Item</th>
                    <th className="px-6 py-4 whitespace-nowrap">Detail</th>
                    <th className="px-6 py-4 whitespace-nowrap">Tim/Konteks</th>
                    <th className="px-6 py-4 whitespace-nowrap">Dihapus Oleh</th>
                    <th className="px-6 py-4 whitespace-nowrap">Tanggal Dihapus</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-gray-500">{item.detail || "-"}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {item.team_name ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {item.team_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Sistem</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {item.deleted_by_name ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                              {item.deleted_by_name.charAt(0).toUpperCase()}
                            </div>
                            {item.deleted_by_name}
                          </div>
                        ) : (
                          <span className="text-gray-400">Sistem / Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {new Date(item.deleted_at).toLocaleString("id-ID")}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRestore(item.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Pulihkan
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        Tidak ada item yang cocok dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
