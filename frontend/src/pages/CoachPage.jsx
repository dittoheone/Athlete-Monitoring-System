import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Swords, Calendar, Settings, Users } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import CoachDashboard from "../features/dashboard/components/CoachDashboard";
import TeamPerformance from "../features/teams/components/TeamPerformance";
import MatchStatistics from "../features/matches/components/MatchStatistics";
import MatchDetail from "../features/matches/components/MatchDetail";
import TrainingProgram from "../features/teams/components/TrainingProgram";
import AthleteProfile from "../features/athletes/components/AthleteProfile";
import AthleteManagement from "../features/athletes/components/AthleteManagement";

const sidebarItems = [
  { path: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/coach/athletes", label: "Manajemen Atlet", icon: Users },
  { path: "/coach/performance", label: "Performa Tim", icon: TrendingUp },
  { path: "/coach/matches", label: "Statistik Pertandingan", icon: Swords },
  { path: "/coach/training", label: "Program Latihan", icon: Calendar },
];

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar items={sidebarItems} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/coach/dashboard" replace />}
            />
            <Route path="/dashboard" element={<CoachDashboard />} />
            <Route path="/performance" element={<TeamPerformance />} />
            <Route path="/matches" element={<MatchStatistics />} />
            <Route path="/matches/:id" element={<MatchDetail />} />
            <Route path="/training" element={<TrainingProgram />} />
            <Route path="/athletes" element={<AthleteManagement />} />
            <Route path="/athletes/:id" element={<AthleteProfile />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
