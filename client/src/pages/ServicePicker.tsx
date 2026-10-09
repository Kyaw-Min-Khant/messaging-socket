import { Link } from "react-router-dom";
import { logout } from "../api/auth";
import { useAuth } from "../contexts/AuthContext";

const SERVICES = [
  {
    to: "/chats",
    icon: "💬",
    title: "Chats",
    description: "Message your friends in real time",
    gradient: "from-indigo-600 to-violet-700",
  },
  {
    to: "/expenses",
    icon: "💰",
    title: "Expenses",
    description: "Track spending, budgets and income",
    gradient: "from-emerald-600 to-teal-700",
  },
];

export function ServicePicker() {
  const { user, clearAuth } = useAuth();

  // Same as the chat sidebar: ProtectedRoute redirects to /login once auth is cleared.
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      clearAuth();
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-950">
      <div className="max-w-md mx-auto px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10 min-h-full flex flex-col">
        <div className="flex items-center justify-between mb-10">
          <Link to="/profile" className="flex items-center gap-3 min-w-0">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Welcome back</p>
              <p className="text-white font-semibold truncate">{user?.username}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">What would you like to do?</h1>
        <p className="text-sm text-gray-500 mb-6">You can switch anytime from the top bar.</p>

        <div className="space-y-4">
          {SERVICES.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`group flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-br ${s.gradient} shadow-lg shadow-black/30 hover:brightness-110 active:scale-[0.98] transition`}
            >
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center text-3xl shrink-0" aria-hidden>
                {s.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-lg font-bold text-white">{s.title}</span>
                <span className="block text-sm text-white/75">{s.description}</span>
              </span>
              <span className="text-2xl text-white/70 group-hover:translate-x-0.5 transition-transform" aria-hidden>
                ›
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
