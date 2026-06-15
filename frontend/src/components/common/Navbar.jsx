import { useAuth } from "../../context/AuthContexts";
import { LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function Navbar() {
  const { user, logout, activeTeamId, setActiveTeamId } = useAuth();
  const location = useLocation();

  // Helper to format breadcrumb parts intelligently
  const formatBreadcrumbPart = (part) => {
    // Check if it's a hybrid ID-Slug (e.g., "1-yoga-pratama" or "3-vs-persija")
    if (/^\d+-/.test(part)) {
      // Extract the slug (everything after the first hyphen)
      const slug = part.substring(part.indexOf('-') + 1);
      // Replace hyphens with spaces and Title Case each word
      return slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }
    // If it's purely a number (fallback), we could return "ID X" or just the number
    if (/^\d+$/.test(part)) return `ID ${part}`;

    // Otherwise, just Title Case the path segment
    return part.charAt(0).toUpperCase() + part.slice(1);
  };

  // Generate breadcrumbs from path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumb = pathParts.map(formatBreadcrumbPart).join(" > ");

  return (
    <nav className="bg-white border-b border-gray-100 h-16 flex-shrink-0 flex items-center justify-between px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-500">
          {breadcrumb || "Dashboard"}
        </span>
      </div>

      {/* User Info & Logout */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="text-right flex items-center gap-4">
            {user?.teams && user.teams.length > 0 && (
              <select
                value={activeTeamId || ""}
                onChange={(e) => {
                  setActiveTeamId(e.target.value);
                  // Optionally reload to fetch new data, or rely on react-query to re-fetch
                  window.location.reload();
                }}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
              >
                {user.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">
                {user?.name || "Dr. Fina"}
              </p>
              <p className="text-xs text-gray-500 capitalize leading-tight mt-0.5">
                {user?.role || "Medis"}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="p-1.5 text-gray-400 hover:text-gray-900 transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </nav>
  );
}
