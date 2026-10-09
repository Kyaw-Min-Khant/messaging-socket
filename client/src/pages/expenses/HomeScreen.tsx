import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import type { BudgetStatusItem, Expense, MonthlyReport } from "../../types";
import { getBudgetStatus, getExpenses, getMonthlyReport } from "../../api/expenses";
import { MonthSwitcher } from "../../components/expenses/MonthSwitcher";
import { TransactionRow } from "../../components/expenses/TransactionRow";
import { CategoryDonut } from "../../components/expenses/charts/CategoryDonut";
import {
  Card,
  EmptyState,
  ProgressBar,
  SectionTitle,
  Spinner,
  errorMessage,
  formatMoney,
  monthRange,
} from "../../components/expenses/ui";
import { useExpensesContext } from "./ExpensesLayout";

interface HomeData {
  report: MonthlyReport;
  overall: BudgetStatusItem | null;
  recent: Expense[];
}

export function HomeScreen() {
  const { month, setMonth, refreshKey, openSheet } = useExpensesContext();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMonthlyReport(month),
      getBudgetStatus(month),
      getExpenses({ ...monthRange(month), page: 1, limit: 5 }),
    ])
      .then(([report, status, list]) => {
        if (cancelled) return;
        setData({
          report,
          overall: status.budgets.find((b) => b.categoryId === null) ?? null,
          recent: list.expenses,
        });
      })
      .catch((err) => toast.error(errorMessage(err, "Failed to load overview")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month, refreshKey]);

  const net = Number(data?.report.net ?? 0);

  return (
    <div className="space-y-5">
      <MonthSwitcher month={month} onChange={setMonth} />

      {loading && !data ? (
        <Spinner />
      ) : !data ? null : (
        <>
          {/* Hero */}
          <div className="rounded-3xl p-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 shadow-lg shadow-indigo-950/50">
            <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider">Spent this month</p>
            <p className="text-4xl font-bold text-white mt-1 tabular-nums">{formatMoney(data.report.totalExpense)}</p>
            <p className="text-indigo-200/80 text-xs mt-1">{data.report.expenseCount} transactions</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white/10 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] text-indigo-200">Income</p>
                <p className="text-base font-semibold text-emerald-300 tabular-nums">
                  +{formatMoney(data.report.totalIncome)}
                </p>
              </div>
              <div className="bg-white/10 rounded-2xl px-3 py-2.5">
                <p className="text-[11px] text-indigo-200">Net</p>
                <p className={`text-base font-semibold tabular-nums ${net < 0 ? "text-red-300" : "text-white"}`}>
                  {net < 0 ? "−" : "+"}
                  {formatMoney(Math.abs(net))}
                </p>
              </div>
            </div>
          </div>

          {/* Overall budget */}
          {data.overall ? (
            <Link to="/expenses/budgets" className="block">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-200">Monthly budget</p>
                  <p
                    className={`text-xs font-medium ${
                      data.overall.exceeded ? "text-red-400" : data.overall.percentUsed >= 80 ? "text-amber-400" : "text-gray-400"
                    }`}
                  >
                    {data.overall.percentUsed}% used
                  </p>
                </div>
                <ProgressBar
                  percent={data.overall.percentUsed}
                  danger={data.overall.exceeded}
                  warn={data.overall.percentUsed >= 80}
                />
                <p className="text-xs text-gray-500 mt-2 tabular-nums">
                  {data.overall.exceeded
                    ? `Over by ${formatMoney(-Number(data.overall.remaining))}`
                    : `${formatMoney(data.overall.remaining)} left of ${formatMoney(data.overall.limit)}`}
                </p>
              </Card>
            </Link>
          ) : (
            <Link
              to="/expenses/budgets"
              className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-gray-700 text-sm text-gray-400 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
            >
              <span className="text-xl" aria-hidden>
                🎯
              </span>
              <span className="flex-1">Set a monthly budget to get overspend warnings</span>
              <span aria-hidden>›</span>
            </Link>
          )}

          {/* Categories */}
          {data.report.byCategory.length > 0 && (
            <section>
              <SectionTitle
                action={
                  <Link to="/expenses/insights" className="text-xs text-indigo-400 hover:text-indigo-300">
                    Insights ›
                  </Link>
                }
              >
                Where it went
              </SectionTitle>
              <Card className="p-4">
                <CategoryDonut data={data.report.byCategory} total={Number(data.report.totalExpense)} legendLimit={4} />
              </Card>
            </section>
          )}

          {/* Recent */}
          <section>
            <SectionTitle
              action={
                data.recent.length > 0 && (
                  <Link to="/expenses/transactions" className="text-xs text-indigo-400 hover:text-indigo-300">
                    See all ›
                  </Link>
                )
              }
            >
              Recent
            </SectionTitle>
            <Card className="p-1.5">
              {data.recent.length === 0 ? (
                <EmptyState
                  icon="🧾"
                  title="No expenses this month"
                  action={
                    <button
                      onClick={() => openSheet({ kind: "expense" })}
                      className="text-sm font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      Add your first expense
                    </button>
                  }
                />
              ) : (
                data.recent.map((e) => (
                  <TransactionRow
                    key={e.id}
                    expense={e}
                    showDate
                    onClick={() => openSheet({ kind: "expense", expense: e })}
                  />
                ))
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
