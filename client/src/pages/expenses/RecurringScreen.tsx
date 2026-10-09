import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import type { PaymentMethod, RecurringExpense, RecurringFrequency } from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  setRecurringActive,
  updateRecurring,
} from "../../api/expenses";
import { BottomSheet } from "../../components/expenses/BottomSheet";
import { categoryLabel, categoryStyle } from "../../components/expenses/categoryStyle";
import {
  CategoryIcon,
  Chip,
  DangerButton,
  EmptyState,
  Field,
  PrimaryButton,
  Spinner,
  errorMessage,
  formatMoney,
  inputClasses,
} from "../../components/expenses/ui";
import { useExpensesContext } from "./ExpensesLayout";

const FREQUENCIES: RecurringFrequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

interface RecurringForm {
  amount: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
  description: string;
}

const frequencyLabel = (f: RecurringFrequency) => f.charAt(0) + f.slice(1).toLowerCase();

export function RecurringScreen() {
  const { categories, refresh } = useExpensesContext();
  const [rules, setRules] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RecurringForm | null>(null);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getRecurring()
      .then(setRules)
      .catch((err) => toast.error(errorMessage(err, "Failed to load recurring expenses")))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      amount: "",
      categoryId: categories[0]?.id ?? "",
      paymentMethod: "CASH",
      frequency: "MONTHLY",
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: "",
      description: "",
    });
  };

  const openEdit = (r: RecurringExpense) => {
    setEditing(r);
    setForm({
      amount: r.amount,
      categoryId: r.categoryId,
      paymentMethod: r.paymentMethod,
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate ?? "",
      description: r.description ?? "",
    });
  };

  const closeSheet = () => {
    setForm(null);
    setEditing(null);
  };

  // Any change can create or stop generated expenses, so other screens refresh too.
  const afterChange = () => {
    closeSheet();
    load();
    refresh();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const input = { ...form, endDate: form.endDate || null, description: form.description || null };
      if (editing) await updateRecurring(editing.id, input);
      else await createRecurring(input);
      toast.success(editing ? "Recurring expense updated" : "Recurring expense created");
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save recurring expense"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await setRecurringActive(editing.id, !editing.active);
      toast.success(editing.active ? "Paused" : "Resumed");
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !window.confirm("Delete this rule? Expenses it already created are kept.")) return;
    setSaving(true);
    try {
      await deleteRecurring(editing.id);
      toast.success("Recurring expense deleted");
      afterChange();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete"));
    } finally {
      setSaving(false);
    }
  };

  const monthlyTotal = rules
    .filter((r) => r.active)
    .reduce((sum, r) => {
      const perMonth = { DAILY: 30, WEEKLY: 52 / 12, MONTHLY: 1, YEARLY: 1 / 12 }[r.frequency];
      return sum + Number(r.amount) * perMonth;
    }, 0);

  return (
    <div className="space-y-5">
      {rules.some((r) => r.active) && (
        <div className="rounded-3xl p-5 bg-gray-900 border border-gray-800">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">About per month</p>
          <p className="text-3xl font-bold text-white mt-1 tabular-nums">{formatMoney(monthlyTotal)}</p>
          <p className="text-xs text-gray-500 mt-1">{rules.filter((r) => r.active).length} active rules</p>
        </div>
      )}

      <PrimaryButton type="button" onClick={openCreate}>
        + Add recurring
      </PrimaryButton>

      {loading && rules.length === 0 ? (
        <Spinner />
      ) : rules.length === 0 ? (
        <EmptyState icon="🔁" title="No recurring expenses. Add rent, subscriptions or bills to log them automatically." />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1.5">
          {rules.map((r) => (
            <button
              key={r.id}
              onClick={() => openEdit(r)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-gray-800/60 transition-colors ${
                r.active ? "" : "opacity-50"
              }`}
            >
              <CategoryIcon category={r.category} />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-gray-100 truncate">
                  {r.description || categoryLabel(r.category)}
                </span>
                <span className="block text-xs text-gray-500 truncate">
                  {frequencyLabel(r.frequency)} ·{" "}
                  {r.active ? `next ${format(parseISO(r.nextRunAt), "MMM d")}` : "paused"}
                </span>
              </span>
              <span className="text-[15px] font-semibold text-white shrink-0 tabular-nums">{formatMoney(r.amount)}</span>
            </button>
          ))}
        </div>
      )}

      {form && (
        <BottomSheet
          title={editing ? "Edit recurring" : "New recurring"}
          subtitle={editing ? "Changes apply to future occurrences" : "Past dates since the start are logged right away"}
          onClose={closeSheet}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount">
                <input
                  inputMode="decimal"
                  required
                  value={form.amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "");
                    if (/^\d*(\.\d{0,2})?$/.test(v)) setForm({ ...form, amount: v });
                  }}
                  placeholder="0.00"
                  className={inputClasses}
                />
              </Field>
              <Field label="Name">
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Rent"
                  className={inputClasses}
                />
              </Field>
            </div>

            <Field label="Repeats">
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1">
                {FREQUENCIES.map((f) => (
                  <Chip key={f} active={form.frequency === f} onClick={() => setForm({ ...form, frequency: f })}>
                    {frequencyLabel(f)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Category">
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {categories.map((c) => (
                  <Chip key={c.id} active={form.categoryId === c.id} onClick={() => setForm({ ...form, categoryId: c.id })}>
                    {categoryStyle(c.name).icon} {categoryLabel(c.name)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Paid with">
              <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
                {PAYMENT_METHODS.map((m) => (
                  <Chip key={m} active={form.paymentMethod === m} onClick={() => setForm({ ...form, paymentMethod: m })}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </Chip>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={inputClasses}
                />
              </Field>
              <Field label="Ends (optional)">
                <input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={inputClasses}
                />
              </Field>
            </div>

            <div className="space-y-2">
              <PrimaryButton disabled={saving || !(Number(form.amount) > 0) || !form.categoryId}>
                {saving ? "Saving…" : editing ? "Save changes" : "Create"}
              </PrimaryButton>
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={toggle}
                    disabled={saving}
                    className="w-full py-3 rounded-2xl border border-gray-700 text-gray-200 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {editing.active ? "⏸ Pause" : "▶ Resume"}
                  </button>
                  <DangerButton onClick={handleDelete} disabled={saving}>
                    Delete rule
                  </DangerButton>
                </>
              )}
            </div>
          </form>
        </BottomSheet>
      )}
    </div>
  );
}
