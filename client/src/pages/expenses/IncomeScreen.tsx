import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { Income, Pagination } from "../../types";
import { getIncome } from "../../api/expenses";
import { MonthSwitcher } from "../../components/expenses/MonthSwitcher";
import { dayLabel } from "../../components/expenses/TransactionRow";
import { EmptyState, PrimaryButton, Spinner, errorMessage, formatMoney, monthRange } from "../../components/expenses/ui";
import { useExpensesContext } from "./ExpensesLayout";

const PAGE_SIZE = 30;

export function IncomeScreen() {
  const { month, setMonth, refreshKey, openSheet } = useExpensesContext();
  const [items, setItems] = useState<Income[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const changeMonth = (m: string) => {
    setMonth(m);
    setPage(1);
  };

  // Saves/deletes go back to page 1 so the list stays consistent.
  useEffect(() => {
    setPage(1);
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getIncome({ ...monthRange(month), page, limit: PAGE_SIZE })
      .then((r) => {
        if (cancelled) return;
        setItems((prev) => (page > 1 ? [...prev, ...r.income] : r.income));
        setPagination(r.pagination);
      })
      .catch((err) => toast.error(errorMessage(err, "Failed to load income")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, page, refreshKey]);

  const total = items.reduce((sum, i) => sum + Number(i.amount), 0);
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;

  return (
    <div className="space-y-5">
      <MonthSwitcher month={month} onChange={changeMonth} />

      <div className="rounded-3xl p-5 bg-gradient-to-br from-emerald-600 to-teal-800">
        <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Received this month</p>
        <p className="text-3xl font-bold text-white mt-1 tabular-nums">+{formatMoney(total)}</p>
        {hasMore && <p className="text-emerald-100/70 text-[11px] mt-1">Load all entries for the full total</p>}
      </div>

      <PrimaryButton type="button" tone="emerald" onClick={() => openSheet({ kind: "income" })}>
        + Add income
      </PrimaryButton>

      {loading && items.length === 0 ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="💰" title="No income recorded this month" />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1.5">
          {items.map((income) => (
            <button
              key={income.id}
              onClick={() => openSheet({ kind: "income", income })}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-gray-800/60 transition-colors"
            >
              <span className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-xl shrink-0" aria-hidden>
                💰
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-gray-100 truncate">{income.source}</span>
                <span className="block text-xs text-gray-500 truncate">
                  {dayLabel(income.receivedAt)}
                  {income.description ? ` · ${income.description}` : ""}
                </span>
              </span>
              <span className="text-[15px] font-semibold text-emerald-400 shrink-0 tabular-nums">
                +{formatMoney(income.amount)}
              </span>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          disabled={loading}
          onClick={() => setPage((p) => p + 1)}
          className="w-full py-3 rounded-2xl border border-gray-800 text-sm text-gray-300 hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
