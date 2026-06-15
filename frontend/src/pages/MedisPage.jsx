import { Routes, Route, Navigate } from "react-router-dom";
import { Users, ClipboardList, Dumbbell, Settings, LayoutDashboard } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import CoachDashboard from "../features/dashboard/components/MedisDashboard";
import MedicalAthleteList from "../features/athletes/components/MedicalAthleteList";
import ExerciseLibrary from "../features/assessments/components/ExerciseLibrary";
import InjuryManagement from "../features/injuries/components/InjuryManagement";
import SPKSettings from "../features/assessments/components/SPKSettings";
import AssessmentForm from "../features/assessments/components/AssessmentForm";
import RecommendationManager from "../features/assessments/components/RecommendationManager";
import MedicalAthleteDetail from "../features/athletes/components/MedicalAthleteDetail";

const sidebarItems = [
  { path: "/medis/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/medis/athletes", label: "Manajemen Atlet", icon: Users },
  { path: "/medis/injuries", label: "Manajemen Cedera", icon: ClipboardList },
  { path: "/medis/settings", label: "Pengaturan SPK", icon: Settings },
  { path: "/medis/exercises", label: "Program Latihan", icon: Dumbbell },
  { path: "/medis/recommendations", label: "Rekomendasi Tambahan", icon: Settings },
];

export default function MedisPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar items={sidebarItems} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/medis/dashboard" replace />}
            />
            <Route path="/dashboard" element={<CoachDashboard />} />
            <Route path="/athletes" element={<MedicalAthleteList />} />
            <Route path="/injuries" element={<InjuryManagement />} />
            <Route path="/settings" element={<SPKSettings />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route
              path="/recommendations"
              element={<RecommendationManager />}
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
