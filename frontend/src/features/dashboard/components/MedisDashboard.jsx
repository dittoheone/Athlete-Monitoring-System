import { useState, useEffect } from "react";
import { Users, ShieldAlert, Sun, BarChart2, ChevronDown, ChevronUp } from "lucide-react";
import { athleteAPI, dashboardAPI } from "../../../services/api";
import { Link } from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { data: athletes = [], isLoading: loadingAthletes } = useQuery({
    queryKey: ['athletes'],
    queryFn: () => athleteAPI.getAll().then(res => res.data)
  });

  const { data: alerts = [], isLoading: loadingAlerts } = useQuery({
    queryKey: ['teamAlerts'],
    queryFn: () => dashboardAPI.getTeamAlerts().then(res => res.data)
  });

  const [expandedAlert, setExpandedAlert] = useState(null);

  const toggleAlert = (idx) => {
    if (expandedAlert === idx) {
      setExpandedAlert(null);
    } else {
      setExpandedAlert(idx);
    }
  };

  const stats = {
    total: athletes.length,
    cedera: athletes.filter((a) => a.status === "Cedera").length,
    rehabilitasi: athletes.filter((a) => a.status === "Rehabilitasi").length,
    underperform: athletes.filter((a) => a.status === "Underperform").length,
  };

  const statusCounts = {
    Prima: athletes.filter((a) => a.status === "Prima").length,
    Fit: athletes.filter((a) => a.status === "Fit").length,
    Underperform: athletes.filter((a) => a.status === "Underperform").length,
    Cedera: athletes.filter((a) => a.status === "Cedera").length,
    Rehabilitasi: athletes.filter((a) => a.status === "Rehabilitasi").length,
  };

  const maxStatus = Math.max(...Object.values(statusCounts), 1); // Avoid div by 0

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Atlet</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Cedera</p>
              <p className="text-xl font-bold text-gray-900">{stats.cedera}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Sun className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Rehabilitasi</p>
              <p className="text-xl font-bold text-gray-900">{stats.rehabilitasi}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-green-50 p-2 rounded-lg">
              <BarChart2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Underperform</p>
              <p className="text-xl font-bold text-gray-900">{stats.underperform}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Atlet (Progress Bars) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-6">Status Atlet</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Prima</span>
                <span className="font-bold text-gray-900">{statusCounts.Prima}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${(statusCounts.Prima / maxStatus) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Fit</span>
                <span className="font-bold text-gray-900">{statusCounts.Fit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${(statusCounts.Fit / maxStatus) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Underperform</span>
                <span className="font-bold text-gray-900">{statusCounts.Underperform}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-orange-400 h-2 rounded-full"
                  style={{ width: `${(statusCounts.Underperform / maxStatus) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Rehabilitasi</span>
                <span className="font-bold text-gray-900">{statusCounts.Rehabilitasi}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${(statusCounts.Rehabilitasi / maxStatus) * 100}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">Cedera</span>
                <span className="font-bold text-gray-900">{statusCounts.Cedera}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${(statusCounts.Cedera / maxStatus) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Peringatan / Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 mb-6">Peringatan</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {alerts && alerts.length > 0 ? alerts.map((alert, idx) => (
              <div key={idx} className={`bg-${alert.type}-50 border border-${alert.type}-100 rounded-xl overflow-hidden`}>
                <div 
                  className="p-3 flex items-start space-x-3 cursor-pointer hover:bg-black/5 transition-colors"
                  onClick={() => toggleAlert(idx)}
                >
                  <div className={`bg-${alert.type}-500 w-2 h-2 rounded-full mt-1.5 flex-shrink-0`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{alert.subtitle}</p>
                  </div>
                  <div className={`text-${alert.type}-600 mt-1`}>
                    {expandedAlert === idx ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                
                {expandedAlert === idx && alert.athletes && alert.athletes.length > 0 && (
                  <div className="px-3 pb-3 pt-1 border-t border-black/5 bg-white/50">
                    <p className="text-xs font-semibold text-gray-700 mb-2 mt-1">Daftar Atlet:</p>
                    <div className="space-y-1.5">
                      {alert.athletes.map(ath => (
                        <Link 
                          key={ath.id} 
                          to="/medis/athletes"
                          state={{ selectedAthleteId: ath.id }}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all group"
                        >
                          <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{ath.name}</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-600">Skor: {ath.value}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                Tidak ada peringatan saat ini.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
