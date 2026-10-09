import { useEffect, useRef, useState } from "react";
import { useExpenses } from "../../hooks/useExpenses";
import { MonthSwitcher } from "../../components/expenses/MonthSwitcher";
import { TransactionRow, dayLabel, groupByDate } from "../../components/expenses/TransactionRow";
import { categoryLabel, categoryStyle } from "../../components/expenses/categoryStyle";
import { Chip, EmptyState, Spinner, formatMoney, monthRange } from "../../components/expenses/ui";
import { useExpensesContext } from "./ExpensesLayout";

const PAGE_SIZE = 30;

export function ActivityScreen() {
  const { categories, month, setMonth, refreshKey, openSheet } = useExpensesContext();
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  const { expenses, pagination, isLoading, reload } = useExpenses(
    { ...monthRange(month), category: category || undefined, page, limit: PAGE_SIZE },
    { append: true },
  );

  const changeMonth = (m: string) => {
    setMonth(m);
    setPage(1);
  };
  const changeCategory = (c: string) => {
    setCategory(c);
    setPage(1);
  };

  // After a save/delete, start over from the first page so the list is consistent.
  const lastRefresh = useRef(refreshKey);
  useEffect(() => {
    if (lastRefresh.current === refreshKey) return;
    lastRefresh.current = refreshKey;
    if (page === 1) reload();
    else setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const groups = groupByDate(expenses);
  const hasMore = pagination ? pagination.page < pagination.totalPages : false;

  return (
    <div className="space-y-4">
      <MonthSwitcher month={month} onChange={changeMonth} />

      <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        <Chip active={category === ""} onClick={() => changeCategory("")}>
          All
        </Chip>
        {categories.map((c) => (
          <Chip key={c.id} active={category === c.name} onClick={() => changeCategory(c.name)}>
            {categoryStyle(c.name).icon} {categoryLabel(c.name)}
          </Chip>
        ))}
      </div>

      {pagination && pagination.total > 0 && (
        <p className="text-xs text-gray-500 px-1">{pagination.total} transactions</p>
      )}

      {isLoading && expenses.length === 0 ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <EmptyState
          icon="🧾"
          title={category ? `No ${categoryLabel(category)} expenses this month` : "No expenses this month"}
          action={
            <button
              onClick={() => openSheet({ kind: "expense" })}
              className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
            >
              Add expense
            </button>
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.date}>
              <div className="sticky top-0 z-10 -mx-4 px-5 py-2 flex justify-between bg-gray-950/95 backdrop-blur">
                <span className="text-xs font-semibold text-gray-400">{dayLabel(g.date)}</span>
                <span className="text-xs text-gray-500 tabular-nums">−{formatMoney(g.total)}</span>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1.5">
                {g.items.map((e) => (
                  <TransactionRow key={e.id} expense={e} onClick={() => openSheet({ kind: "expense", expense: e })} />
                ))}
              </div>
            </section>
          ))}

          {hasMore && (
            <button
              disabled={isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-3 rounded-2xl border border-gray-800 text-sm text-gray-300 hover:bg-gray-900 disabled:opacity-50"
            >
              {isLoading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
