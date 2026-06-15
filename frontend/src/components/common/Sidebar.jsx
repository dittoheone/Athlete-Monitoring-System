import { NavLink } from "react-router-dom";
import { Activity } from "lucide-react";

export default function Sidebar({ items }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen overflow-y-auto">
      <div className="p-6 flex items-center space-x-3 mb-4">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900 tracking-tight">Athmon</span>
      </div>
      <nav className="px-4 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors text-sm ${
                  isActive
                    ? "bg-gray-50 text-gray-900 font-semibold"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
