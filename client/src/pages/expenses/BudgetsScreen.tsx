import { useCallback, useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import type { BudgetStatus, BudgetStatusItem } from "../../types";
import { createBudget, deleteBudget, getBudgetStatus, updateBudget } from "../../api/expenses";
import { BottomSheet } from "../../components/expenses/BottomSheet";
import { MonthSwitcher } from "../../components/expenses/MonthSwitcher";
import { categoryLabel, categoryStyle } from "../../components/expenses/categoryStyle";
import {
  CategoryIcon,
  DangerButton,
  EmptyState,
  Field,
  PrimaryButton,
  ProgressBar,
  SectionTitle,
  Spinner,
  errorMessage,
  formatMoney,
  inputClasses,
} from "../../components/expenses/ui";
import { useExpensesContext } from "./ExpensesLayout";

const OVERALL = "__overall__";

function statusTone(b: BudgetStatusItem) {
  return b.exceeded ? "text-red-400" : b.percentUsed >= 80 ? "text-amber-400" : "text-gray-400";
}

function remainingText(b: BudgetStatusItem) {
  return b.exceeded ? `Over by ${formatMoney(-Number(b.remaining))}` : `${formatMoney(b.remaining)} left`;
}

export function BudgetsScreen() {
  const { categories, month, setMonth, refreshKey } = useExpensesContext();
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

  useEffect(load, [load, refreshKey]);

  const usedCategoryIds = new Set(status?.budgets.map((b) => b.categoryId ?? OVERALL));
  const available = [{ id: OVERALL, name: "Overall" }, ...categories].filter((c) => !usedCategoryIds.has(c.id));
  const overall = status?.budgets.find((b) => b.categoryId === null);
  const perCategory = status?.budgets.filter((b) => b.categoryId !== null) ?? [];

  const openCreate = () => {
    setEditing(null);
    setForm({ categoryId: available[0]?.id ?? OVERALL, amount: "" });
  };

  const openEdit = (b: BudgetStatusItem) => {
    setEditing(b);
    setForm({ categoryId: b.categoryId ?? OVERALL, amount: b.limit });
  };

  const closeSheet = () => setForm(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      if (editing) {
        await updateBudget(editing.budgetId, { amount: form.amount });
      } else {
        await createBudget({ categoryId: form.categoryId === OVERALL ? null : form.categoryId, amount: form.amount });
      }
      toast.success(editing ? "Budget updated" : "Budget created");
      closeSheet();
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save budget"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm(`Delete the ${editing.category ? categoryLabel(editing.category) : "overall"} budget?`)) return;
    setSaving(true);
    try {
      await deleteBudget(editing.budgetId);
      toast.success("Budget deleted");
      closeSheet();
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete budget"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <MonthSwitcher month={month} onChange={setMonth} />

      {loading && !status ? (
        <Spinner />
      ) : (
        <>
          {overall && (
            <button
              onClick={() => openEdit(overall)}
              className="w-full text-left rounded-3xl p-5 bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Overall budget</p>
                <p className={`text-xs font-semibold ${statusTone(overall)}`}>{overall.percentUsed}%</p>
              </div>
              <p className="text-3xl font-bold text-white mt-1 tabular-nums">
                {formatMoney(overall.spent)}
                <span className="text-base font-medium text-gray-500"> / {formatMoney(overall.limit)}</span>
              </p>
              <div className="mt-3">
                <ProgressBar percent={overall.percentUsed} danger={overall.exceeded} warn={overall.percentUsed >= 80} />
              </div>
              <p className={`text-xs mt-2 ${overall.exceeded ? "text-red-400" : "text-gray-500"}`}>{remainingText(overall)}</p>
            </button>
          )}

          {perCategory.length > 0 && (
            <section>
              <SectionTitle>By category</SectionTitle>
              <div className="space-y-2">
                {perCategory.map((b) => (
                  <button
                    key={b.budgetId}
                    onClick={() => openEdit(b)}
                    className="w-full text-left flex items-center gap-3 p-3.5 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
                  >
                    <CategoryIcon category={b.category} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <p className="text-sm font-medium text-gray-100 truncate">{categoryLabel(b.category ?? "")}</p>
                        <p className={`text-xs tabular-nums shrink-0 ${statusTone(b)}`}>
                          {formatMoney(b.spent)} / {formatMoney(b.limit)}
                        </p>
                      </div>
                      <ProgressBar percent={b.percentUsed} danger={b.exceeded} warn={b.percentUsed >= 80} />
                      <p className={`text-[11px] mt-1 ${b.exceeded ? "text-red-400" : "text-gray-500"}`}>{remainingText(b)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!overall && perCategory.length === 0 && (
            <EmptyState icon="🎯" title="No budgets yet. Set a monthly limit to get warnings when you overspend." />
          )}

          {available.length > 0 && (
            <button
              onClick={openCreate}
              className="w-full py-3.5 rounded-2xl border border-dashed border-gray-700 text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-indigo-300 transition-colors"
            >
              + New budget
            </button>
          )}
        </>
      )}

      {form && (
        <BottomSheet
          title={editing ? "Edit budget" : "New budget"}
          subtitle="Monthly spending limit"
          onClose={closeSheet}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <Field label="Category">
              {editing ? (
                <div className="flex items-center gap-3">
                  <CategoryIcon category={editing.category} size="sm" />
                  <p className="text-sm text-gray-200">{editing.category ? categoryLabel(editing.category) : "Overall"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {available.map((c) => {
                    const active = form.categoryId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm({ ...form, categoryId: c.id })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-colors ${
                          active ? "border-indigo-500 bg-indigo-500/10" : "border-gray-800 bg-gray-800/40"
                        }`}
                      >
                        <span className="text-xl" aria-hidden>
                          {c.id === OVERALL ? "🎯" : categoryStyle(c.name).icon}
                        </span>
                        <span className={`text-[11px] w-full px-1 truncate ${active ? "text-white" : "text-gray-400"}`}>
                          {c.id === OVERALL ? "Overall" : categoryLabel(c.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </Field>
            <Field label="Monthly limit">
              <input
                inputMode="decimal"
                required
                autoFocus={!!editing}
                value={form.amount}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  if (/^\d*(\.\d{0,2})?$/.test(v)) setForm({ ...form, amount: v });
                }}
                placeholder="0.00"
                className={inputClasses}
              />
            </Field>
            <div className="space-y-1">
              <PrimaryButton disabled={saving || !(Number(form.amount) > 0)}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create budget"}
              </PrimaryButton>
              {editing && (
                <DangerButton onClick={handleDelete} disabled={saving}>
                  Delete budget
                </DangerButton>
              )}
            </div>
          </form>
        </BottomSheet>
      )}
    </div>
  );
}
