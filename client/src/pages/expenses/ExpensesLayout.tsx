import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import type { ExpenseCategoryItem } from "../../types";
import { getExpenseCategories } from "../../api/expenses";
import { AppSwitcher, HomeButton } from "../../components/AppSwitcher";
import { BottomNav } from "../../components/expenses/BottomNav";
import { ExpenseSheet, type SheetTarget } from "../../components/expenses/ExpenseSheet";
import { Spinner, currentMonth } from "../../components/expenses/ui";

export interface ExpensesContext {
  categories: ExpenseCategoryItem[];
  reloadCategories: () => void;
  /** Selected month ("yyyy-MM"), shared across screens. */
  month: string;
  setMonth: (month: string) => void;
  /** Bumped whenever a transaction is saved or deleted; screens re-fetch on it. */
  refreshKey: number;
  refresh: () => void;
  openSheet: (target: SheetTarget) => void;
}

export const useExpensesContext = () => useOutletContext<ExpensesContext>();

// Sub-screens get a back arrow and title; the bottom-nav tabs show the app switcher instead.
const SUB_SCREENS: Record<string, { title: string; back: string }> = {
  "/expenses/more": { title: "More", back: "/expenses" },
  "/expenses/income": { title: "Income", back: "/expenses/more" },
  "/expenses/recurring": { title: "Recurring", back: "/expenses/more" },
};

export function ExpensesLayout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const subScreen = SUB_SCREENS[pathname.replace(/\/$/, "")];

  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);
  const reloadCategories = useCallback(() => {
    getExpenseCategories()
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories"));
  }, []);
  useEffect(reloadCategories, [reloadCategories]);

  const [month, setMonth] = useState(currentMonth);
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);

  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollTo, which React
    // would otherwise treat as the effect's cleanup function.
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const context: ExpensesContext = {
    categories,
    reloadCategories,
    month,
    setMonth,
    refreshKey,
    refresh,
    openSheet: setSheet,
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      <header className="shrink-0 pt-[env(safe-area-inset-top)] bg-gray-950/95 backdrop-blur border-b border-gray-900">
        <div className="max-w-md mx-auto h-14 px-2 flex items-center gap-1">
          {subScreen ? (
            <>
              <button
                onClick={() => navigate(subScreen.back)}
                aria-label="Back"
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                </svg>
              </button>
              <h1 className="flex-1 text-lg font-bold text-white">{subScreen.title}</h1>
            </>
          ) : (
            <>
              <HomeButton />
              <div className="flex-1 flex justify-center">
                <AppSwitcher />
              </div>
            </>
          )}
          {pathname !== "/expenses/more" && (
            <Link
              to="/expenses/more"
              aria-label="More"
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </Link>
          )}
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 pt-4 pb-8">
          <Suspense fallback={<Spinner />}>
            <Outlet context={context} />
          </Suspense>
        </div>
      </main>

      <BottomNav onAdd={() => setSheet({ kind: "expense" })} />

      {sheet && (
        <ExpenseSheet target={sheet} categories={categories} onClose={() => setSheet(null)} onSaved={refresh} />
      )}
    </div>
  );
}
