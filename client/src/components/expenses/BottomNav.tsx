import { NavLink } from "react-router-dom";

const ITEMS = [
  {
    to: "/expenses",
    label: "Home",
    path: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z",
  },
  {
    to: "/expenses/transactions",
    label: "Activity",
    path: "M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2v14H3v3c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V2l-1.5 1.5zM19 19c0 .55-.45 1-1 1s-1-.45-1-1v-3H8V5h11v14zM9 7h6v2H9zm7 0h2v2h-2zm-7 3h6v2H9zm7 0h2v2h-2z",
  },
  null, // FAB slot
  {
    to: "/expenses/budgets",
    label: "Budgets",
    path: "M11 2v20c-5.07-.5-9-4.79-9-10s3.93-9.5 9-10zm2.03 0v8.99H22c-.47-4.74-4.24-8.52-8.97-8.99zm0 11.01V22c4.74-.47 8.5-4.25 8.97-8.99h-8.97z",
  },
  {
    to: "/expenses/insights",
    label: "Insights",
    path: "M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z",
  },
];

export function BottomNav({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="shrink-0 border-t border-gray-800 bg-gray-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto grid grid-cols-5 items-end h-16">
        {ITEMS.map((item) =>
          item ? (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 h-full text-[11px] font-medium transition-colors ${
                  isActive ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"
                }`
              }
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d={item.path} />
              </svg>
              {item.label}
            </NavLink>
          ) : (
            <div key="fab" className="flex justify-center h-full">
              <button
                onClick={onAdd}
                aria-label="Add transaction"
                className="-mt-5 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white shadow-lg shadow-indigo-900/50 ring-4 ring-gray-950 flex items-center justify-center transition"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
            </div>
          ),
        )}
      </div>
    </nav>
  );
}
