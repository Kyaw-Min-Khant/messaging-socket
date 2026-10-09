import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CategoriesSheet } from "../../components/expenses/CategoriesSheet";
import { useExpensesContext } from "./ExpensesLayout";

function MenuRow({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <>
      <span className="w-11 h-11 rounded-2xl bg-gray-800 flex items-center justify-center text-xl shrink-0" aria-hidden>
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-medium text-gray-100">{title}</span>
        <span className="block text-xs text-gray-500 truncate">{subtitle}</span>
      </span>
      <span className="text-gray-600 text-xl" aria-hidden>
        ›
      </span>
    </>
  );
}

const rowClass = "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-gray-800/60 transition-colors";

function Group({ children }: { children: ReactNode }) {
  return <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1.5">{children}</div>;
}

export function MoreScreen() {
  const { categories, reloadCategories } = useExpensesContext();
  const [showCategories, setShowCategories] = useState(false);

  return (
    <div className="space-y-4">
      <Group>
        <Link to="/expenses/income" className={rowClass}>
          <MenuRow icon="💰" title="Income" subtitle="Salary, freelance and other money in" />
        </Link>
        <Link to="/expenses/recurring" className={rowClass}>
          <MenuRow icon="🔁" title="Recurring" subtitle="Rent, subscriptions and bills logged automatically" />
        </Link>
        <button onClick={() => setShowCategories(true)} className={rowClass}>
          <MenuRow icon="🏷️" title="Categories" subtitle="Manage your custom categories" />
        </button>
      </Group>

      <Group>
        <Link to="/chats" className={rowClass}>
          <MenuRow icon="💬" title="Go to Chats" subtitle="Switch to your conversations" />
        </Link>
      </Group>

      {showCategories && (
        <CategoriesSheet
          categories={categories}
          onChanged={reloadCategories}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
}
