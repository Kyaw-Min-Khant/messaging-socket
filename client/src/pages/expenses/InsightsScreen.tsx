import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { MonthlyReport } from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import { downloadCsv, getMonthlyReport } from "../../api/expenses";
import { MonthSwitcher } from "../../components/expenses/MonthSwitcher";
import { CategoryDonut } from "../../components/expenses/charts/CategoryDonut";
import { DailyBars } from "../../components/expenses/charts/DailyBars";
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

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl px-3 py-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums truncate ${tone}`}>{formatMoney(value)}</p>
    </div>
  );
}

export function InsightsScreen() {
  const { month, setMonth, refreshKey } = useExpensesContext();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMonthlyReport(month)
      .then(setReport)
      .catch((err) => toast.error(errorMessage(err, "Failed to load report")))
      .finally(() => setLoading(false));
  }, [month, refreshKey]);

  const exportMonth = async (type: "expense" | "income") => {
    const { startDate, endDate } = monthRange(month);
    setExporting(true);
    try {
      await downloadCsv({ type, from: startDate, to: endDate });
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const net = Number(report?.net ?? 0);
  const totalExpense = Number(report?.totalExpense ?? 0);
  const avgPerDay = report && report.byDay.length > 0 ? totalExpense / report.byDay.length : 0;

  return (
    <div className="space-y-5">
      <MonthSwitcher month={month} onChange={setMonth} />

      {loading && !report ? (
        <Spinner />
      ) : !report ? null : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Income" value={report.totalIncome} tone="text-emerald-400" />
            <Stat label="Spent" value={report.totalExpense} tone="text-white" />
            <Stat label="Net" value={report.net} tone={net < 0 ? "text-red-400" : "text-indigo-300"} />
          </div>

          {report.byCategory.length === 0 ? (
            <Card>
              <EmptyState icon="📊" title="No expenses this month" />
            </Card>
          ) : (
            <>
              <section>
                <SectionTitle>By category · {report.expenseCount} expenses</SectionTitle>
                <Card className="p-4">
                  <CategoryDonut data={report.byCategory} total={totalExpense} />
                </Card>
              </section>

              <section>
                <SectionTitle
                  action={<span className="text-xs text-gray-500 tabular-nums">avg {formatMoney(avgPerDay)}/active day</span>}
                >
                  Daily spending
                </SectionTitle>
                <Card className="p-4">
                  <DailyBars month={month} data={report.byDay} />
                </Card>
              </section>

              {report.byPaymentMethod.length > 0 && (
                <section>
                  <SectionTitle>Paid with</SectionTitle>
                  <Card className="p-4 space-y-3.5">
                    {[...report.byPaymentMethod]
                      .sort((a, b) => Number(b.total) - Number(a.total))
                      .map((p) => (
                        <div key={p.paymentMethod}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-gray-300">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</span>
                            <span className="text-white font-medium tabular-nums">{formatMoney(p.total)}</span>
                          </div>
                          <ProgressBar percent={totalExpense ? (Number(p.total) / totalExpense) * 100 : 0} />
                        </div>
                      ))}
                  </Card>
                </section>
              )}
            </>
          )}

          <section>
            <SectionTitle>Export</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  disabled={exporting}
                  onClick={() => exportMonth(t)}
                  className="py-3 rounded-2xl bg-gray-900 border border-gray-800 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  ⬇ {t === "expense" ? "Expenses" : "Income"} CSV
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
