import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Expense, ExpenseCategoryItem, ExpenseFilters, ExpenseSummary, PaymentMethod } from "../types";
import { PAYMENT_METHOD_LABELS } from "../types";
import {
  createExpense,
  getExpenseCategories,
  getExpenseSummary,
  updateExpense,
  type CreateExpenseInput,
} from "../api/expenses";
import { useExpenses } from "../hooks/useExpenses";

type Tab = "list" | "summary";
type GroupBy = "day" | "category";

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  FOOD: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  TRANSPORT: { bg: "bg-violet-500/20", text: "text-violet-400" },
  HOUSING: { bg: "bg-blue-500/20", text: "text-blue-400" },
  UTILITIES: { bg: "bg-teal-500/20", text: "text-teal-400" },
  HEALTHCARE: { bg: "bg-rose-500/20", text: "text-rose-400" },
  ENTERTAINMENT: { bg: "bg-pink-500/20", text: "text-pink-400" },
  SHOPPING: { bg: "bg-amber-500/20", text: "text-amber-400" },
  EDUCATION: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  TRAVEL: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  SAVINGS: { bg: "bg-lime-500/20", text: "text-lime-400" },
  OTHER: { bg: "bg-gray-500/20", text: "text-gray-400" },
};

function formatMoney(amount: string) {
  return Number(amount).toFixed(2);
}

function formatAmount(amount: string, currency: string) {
  return `${currency} ${formatMoney(amount)}`;
}

const inputClasses =
  "w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

function CategoryIcon({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] ?? CATEGORY_STYLES["OTHER"];
  return (
    <div className={`w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center shrink-0`}>
      <svg className={`w-4 h-4 ${style.text}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </svg>
    </div>
  );
}

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface ExpenseFormState {
  amount: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  spentAt: string;
  description: string;
}

function emptyForm(categoryId = ""): ExpenseFormState {
  return {
    amount: "",
    categoryId,
    paymentMethod: "CASH",
    spentAt: format(new Date(), "yyyy-MM-dd"),
    description: "",
  };
}

export function Expenses() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("list");

  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([]);

  useEffect(() => {
    getExpenseCategories()
      .then(setCategories)
      .catch(() => toast.error("Failed to load categories"));
  }, []);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState<string>("");
  const [page, setPage] = useState(1);

  const filters: ExpenseFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    category: category || undefined,
    page,
    limit: 20,
  };
  const { expenses, pagination, isLoading, reload, removeExpense } = useExpenses(filters);

  const [groupBy, setGroupBy] = useState<GroupBy>("category");
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (tab !== "summary") return;
    setSummaryLoading(true);
    getExpenseSummary({ startDate: startDate || undefined, endDate: endDate || undefined, groupBy })
      .then(setSummary)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load summary"))
      .finally(() => setSummaryLoading(false));
  }, [tab, groupBy, startDate, endDate]);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm(categories[0]?.id ?? ""));
    setShowModal(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      amount: expense.amount,
      categoryId: expense.categoryId,
      paymentMethod: expense.paymentMethod,
      spentAt: expense.spentAt,
      description: expense.description ?? "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const input: CreateExpenseInput = {
        amount: form.amount,
        categoryId: form.categoryId,
        paymentMethod: form.paymentMethod,
        spentAt: form.spentAt,
        description: form.description || undefined,
      };
      if (editingId) {
        await updateExpense(editingId, input);
        toast.success("Expense updated");
      } else {
        await createExpense(input);
        toast.success("Expense added");
      }
      setShowModal(false);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    if (!window.confirm("Delete this expense?")) return;
    removeExpense(expense.id);
  };

  const changeFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors text-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
          Back to Chat
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Expenses</h1>
          <button
            onClick={openCreateModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            + Add Expense
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => changeFilter(() => setStartDate(e.target.value))}
            className={inputClasses}
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => changeFilter(() => setEndDate(e.target.value))}
            className={inputClasses}
          />
          <select
            value={category}
            onChange={(e) => changeFilter(() => setCategory(e.target.value))}
            className={inputClasses}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex px-1 gap-1 mb-4">
          {(["list", "summary"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                tab === t
                  ? "bg-indigo-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "list" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-14">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-500">
                <svg className="w-10 h-10 mb-3 opacity-30" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
                <p className="text-sm">No expenses yet</p>
                <button
                  onClick={openCreateModal}
                  className="mt-1.5 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  Add your first expense
                </button>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <CategoryIcon category={expense.category} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {expense.category}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {expense.description || format(new Date(expense.spentAt), "MMM d, yyyy")}
                        {" · "}
                        {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-white shrink-0">
                      {formatAmount(expense.amount, expense.currency)}
                    </p>
                    <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(expense)}
                        title="Edit"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(expense)}
                        title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="text-xs text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-gray-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="text-xs text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "summary" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex px-0 gap-1 mb-5 max-w-[200px]">
              {(["category", "day"] as GroupBy[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGroupBy(g)}
                  className={`flex-1 py-1 text-xs font-medium rounded-lg transition-colors capitalize ${
                    groupBy === g
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  By {g}
                </button>
              ))}
            </div>

            {summaryLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !summary ? null : (
              <>
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-white mb-6">
                  {formatMoney(summary.totalAmount)}
                </p>

                {groupBy === "category" &&
                  (summary.byCategory ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500">No data for this range.</p>
                ) : (
                  groupBy === "category" &&
                  summary.byCategory?.map((c) => {
                    const total = Number(summary.totalAmount);
                    const pct = total === 0 ? 0 : (Number(c.total) / total) * 100;
                    return (
                      <div key={c.category} className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{c.category}</span>
                          <span className="text-gray-400">
                            {formatMoney(c.total)} · {c.count}
                          </span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}

                {groupBy === "day" &&
                  (summary.byDay ?? []).length === 0 ? (
                  <p className="text-sm text-gray-500">No data for this range.</p>
                ) : (
                  groupBy === "day" && (
                    <div className="space-y-1.5">
                      {summary.byDay?.map((d) => (
                        <div
                          key={d.date}
                          className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
                        >
                          <span className="text-sm text-gray-300">
                            {format(new Date(d.date), "MMM d, yyyy")}
                          </span>
                          <span className="text-sm font-medium text-white">
                            {formatMoney(d.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-white font-semibold text-base mb-1">
              {editingId ? "Edit expense" : "Add expense"}
            </h2>
            <p className="text-gray-400 text-xs mb-5">
              {editingId ? "Update the details below" : "Track a new expense"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  required
                  className={inputClasses}
                >
                  <option value="" disabled>Select a category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Payment Method</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                  className={inputClasses}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={form.spentAt}
                  onChange={(e) => setForm({ ...form, spentAt: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Lunch with team"
                  className={inputClasses}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
