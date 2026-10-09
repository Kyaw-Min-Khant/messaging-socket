import { NavLink } from "react-router-dom";

const APPS = [
  { to: "/chats", label: "Chats" },
  { to: "/expenses", label: "Expenses" },
];

/** Segmented control for jumping between the Chats and Expenses apps. */
export function AppSwitcher() {
  return (
    <nav className="flex p-0.5 bg-gray-800 rounded-full" aria-label="Switch app">
      {APPS.map((app) => (
        <NavLink
          key={app.to}
          to={app.to}
          className={({ isActive }) =>
            `px-3.5 py-1 text-xs font-semibold rounded-full transition-colors ${
              isActive ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`
          }
        >
          {app.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Small grid icon that returns to the service picker. */
export function HomeButton({ className = "" }: { className?: string }) {
  return (
    <NavLink
      to="/"
      end
      title="All services"
      aria-label="All services"
      className={`p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${className}`}
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z" />
      </svg>
    </NavLink>
  );
}
