import { useEffect, useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { MonthlyReport } from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import { downloadCsv, getMonthlyReport } from "../../api/expenses";
import { Card, ProgressBar, Spinner, errorMessage, formatMoney, inputClasses } from "./ui";

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="bg-gray-800 rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className={`text-base font-bold ${tone}`}>{formatMoney(value)}</p>
    </div>
  );
}

export function ReportsTab() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMonthlyReport(month)
      .then(setReport)
      .catch((err) => toast.error(errorMessage(err, "Failed to load report")))
      .finally(() => setLoading(false));
  }, [month]);

  const exportMonth = async (type: "expense" | "income") => {
    const [y, m] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = format(new Date(y, m, 0), "yyyy-MM-dd");
    setExporting(true);
    try {
      await downloadCsv({ type, from, to });
    } catch (err) {
      toast.error(errorMessage(err, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  const net = Number(report?.net ?? 0);
  const totalExpense = Number(report?.totalExpense ?? 0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={`${inputClasses} max-w-[180px]`}
        />
        <div className="flex gap-2">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              disabled={exporting}
              onClick={() => exportMonth(t)}
              className="text-xs text-gray-300 border border-gray-700 hover:bg-gray-800 disabled:opacity-50 px-3 py-2 rounded-xl transition-colors"
            >
              ⬇ {t === "expense" ? "Expenses" : "Income"} CSV
            </button>
          ))}
        </div>
      </div>

      <Card className="p-5">
        {loading || !report ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-6">
              <Stat label="Income" value={report.totalIncome} tone="text-emerald-400" />
              <Stat label="Expenses" value={report.totalExpense} tone="text-white" />
              <Stat label="Net" value={report.net} tone={net < 0 ? "text-red-400" : "text-indigo-300"} />
            </div>

            <p className="text-xs text-gray-500 mb-3">By category · {report.expenseCount} expenses</p>
            {report.byCategory.length === 0 ? (
              <p className="text-sm text-gray-500 mb-6">No expenses this month.</p>
            ) : (
              <div className="mb-6">
                {report.byCategory.map((c) => (
                  <div key={c.categoryId} className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300">{c.category}</span>
                      <span className="text-gray-400">
                        {formatMoney(c.total)} · {c.count}
                      </span>
                    </div>
                    <ProgressBar percent={totalExpense ? (Number(c.total) / totalExpense) * 100 : 0} />
                  </div>
                ))}
              </div>
            )}

            {report.byPaymentMethod.length > 0 && (
              <>
                <p className="text-xs text-gray-500 mb-2">By payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {report.byPaymentMethod.map((p) => (
                    <div key={p.paymentMethod} className="flex justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-300">{PAYMENT_METHOD_LABELS[p.paymentMethod]}</span>
                      <span className="text-xs font-medium text-white">{formatMoney(p.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}
