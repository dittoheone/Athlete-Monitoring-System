import { Routes, Route, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, Settings, Activity, Recycle } from "lucide-react";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";
import AdminDashboard from "../features/dashboard/components/AdminDashboard";
import UserManagement from "../features/users/components/UserManagement";
import SystemSettings from "../features/dashboard/components/SystemSettings";
import ActivityLog from "../features/dashboard/components/ActivityLog";
import RecycleBin from "../features/dashboard/components/RecycleBin";
import SupportInbox from "../features/users/components/SupportInbox";
import TeamManagement from "../features/teams/components/TeamManagement";
import { Inbox, Shield } from "lucide-react";

const sidebarItems = [
  { path: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/support", label: "Inbox Dukungan", icon: Inbox },
  { path: "/admin/teams", label: "Manajemen Tim", icon: Shield },
  { path: "/admin/users", label: "Manajemen Pengguna", icon: Users },
  { path: "/admin/settings", label: "Pengaturan Sistem", icon: Settings },
  { path: "/admin/logs", label: "Log Aktivitas", icon: Activity },
  { path: "/admin/recycle-bin", label: "Recycle Bin", icon: Recycle },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      <Sidebar items={sidebarItems} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/support" element={<SupportInbox onProcessAccountRequest={() => {
              // Redirect to user management and potentially pass data
              window.location.href = '/admin/users';
            }} />} />
            <Route path="/teams" element={<TeamManagement />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/logs" element={<ActivityLog />} />
            <Route path="/recycle-bin" element={<RecycleBin addToast={(msg, type) => console.log(type, msg)} />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
