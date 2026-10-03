import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { BudgetStatus, BudgetStatusItem, ExpenseCategoryItem } from "../../types";
import { createBudget, deleteBudget, getBudgetStatus, updateBudget } from "../../api/expenses";
import {
  Card,
  DELETE_ICON,
  EDIT_ICON,
  Field,
  FormActions,
  IconButton,
  Modal,
  ProgressBar,
  Spinner,
  errorMessage,
  formatMoney,
  inputClasses,
} from "./ui";

const OVERALL = "__overall__";

export function BudgetsTab({ categories }: { categories: ExpenseCategoryItem[] }) {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ categoryId: string; amount: string } | null>(null);
  const [editing, setEditing] = useState<BudgetStatusItem | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getBudgetStatus(month)
      .then(setStatus)
      .catch((err) => toast.error(errorMessage(err, "Failed to load budgets")))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(load, [load]);

  const usedCategoryIds = new Set(status?.budgets.map((b) => b.categoryId ?? OVERALL));
  const available = [
    { id: OVERALL, name: "Overall (all categories)" },
    ...categories,
  ].filter((c) => !usedCategoryIds.has(c.id));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing.budgetId, { amount: form.amount });
      } else {
        await createBudget({
          categoryId: form.categoryId === OVERALL ? null : form.categoryId,
          amount: form.amount,
        });
      }
      toast.success(editing ? "Budget updated" : "Budget created");
      setForm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save budget"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: BudgetStatusItem) => {
    if (!window.confirm(`Delete the ${b.category ?? "overall"} budget?`)) return;
    try {
      await deleteBudget(b.budgetId);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete budget"));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-3">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className={`${inputClasses} max-w-[180px]`}
        />
        <button
          disabled={available.length === 0}
          onClick={() => {
            setEditing(null);
            setForm({ categoryId: available[0]?.id ?? OVERALL, amount: "" });
          }}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Add Budget
        </button>
      </div>

      <Card className="p-5">
        {loading ? (
          <Spinner />
        ) : !status || status.budgets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No budgets yet. Set a monthly limit to get warnings when you overspend.
          </p>
        ) : (
          <div className="space-y-4">
            {status.budgets.map((b) => (
              <div key={b.budgetId} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-200 font-medium">{b.category ?? "Overall"}</span>
                  <div className="flex items-center gap-2">
                    <span className={b.exceeded ? "text-red-400" : b.percentUsed >= 80 ? "text-amber-400" : "text-gray-400"}>
                      {formatMoney(b.spent)} / {formatMoney(b.limit)} · {b.percentUsed}%
                    </span>
                    <div className="hidden group-hover:flex gap-1">
                      <IconButton
                        title="Edit"
                        path={EDIT_ICON}
                        onClick={() => {
                          setEditing(b);
                          setForm({ categoryId: b.categoryId ?? OVERALL, amount: b.limit });
                        }}
                      />
                      <IconButton title="Delete" path={DELETE_ICON} danger onClick={() => handleDelete(b)} />
                    </div>
                  </div>
                </div>
                <ProgressBar percent={b.percentUsed} danger={b.exceeded} warn={b.percentUsed >= 80} />
                <p className="text-[11px] text-gray-500 mt-1">
                  {b.exceeded
                    ? `Over by ${formatMoney(String(-Number(b.remaining)))}`
                    : `${formatMoney(b.remaining)} left`}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {form && (
        <Modal title={editing ? "Edit budget" : "Add budget"} subtitle="Monthly spending limit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Category">
              {editing ? (
                <p className="text-sm text-gray-200">{editing.category ?? "Overall"}</p>
              ) : (
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputClasses}
                >
                  {available.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="Monthly limit">
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
            </Field>
            <FormActions saving={saving} onCancel={() => setForm(null)} />
          </form>
        </Modal>
      )}
    </>
  );
}
