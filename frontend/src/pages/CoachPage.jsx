import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, Trophy } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import Dashboard from "../components/coach/Dashboard";
import AthleteProfile from "../components/coach/AthleteProfile";
import TeamOverview from "../components/coach/TeamOverview";
import AthleteManagement from "../components/coach/AthleteManagement";

const sidebarItems = [
  { path: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    path: "/coach/athletemanagement",
    label: "Athlete Management",
    icon: Users,
  },
  { path: "/coach/team", label: "Team Overview", icon: Trophy },
];

export default function CoachPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar items={sidebarItems} />
        <main className="flex-1 p-6">
          <Routes>
            <Route
              path="/"
              element={<Navigate to="/coach/dashboard" replace />}
            />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/AthleteManagement" element={<AthleteManagement />} />
            <Route path="/athletes" element={<Dashboard />} />
            <Route path="/athletes/:id" element={<AthleteProfile />} />
            <Route path="/team" element={<TeamOverview />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
