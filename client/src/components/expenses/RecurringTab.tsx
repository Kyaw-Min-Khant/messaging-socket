import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type {
  ExpenseCategoryItem,
  PaymentMethod,
  RecurringExpense,
  RecurringFrequency,
} from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import {
  createRecurring,
  deleteRecurring,
  getRecurring,
  setRecurringActive,
  updateRecurring,
} from "../../api/expenses";
import {
  Card,
  DELETE_ICON,
  EDIT_ICON,
  Field,
  FormActions,
  IconButton,
  Modal,
  PAUSE_ICON,
  PLAY_ICON,
  Spinner,
  errorMessage,
  formatMoney,
  inputClasses,
} from "./ui";

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

export function RecurringTab({
  categories,
  onExpensesChanged,
}: {
  categories: ExpenseCategoryItem[];
  onExpensesChanged: () => void;
}) {
  const [rules, setRules] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RecurringForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    setEditingId(null);
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
    setEditingId(r.id);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const input = { ...form, endDate: form.endDate || null, description: form.description || null };
      if (editingId) await updateRecurring(editingId, input);
      else await createRecurring(input);
      toast.success(editingId ? "Recurring expense updated" : "Recurring expense created");
      setForm(null);
      load();
      onExpensesChanged();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save recurring expense"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: RecurringExpense) => {
    try {
      await setRecurringActive(r.id, !r.active);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to update"));
    }
  };

  const handleDelete = async (r: RecurringExpense) => {
    if (!window.confirm("Delete this rule? Expenses it already created are kept.")) return;
    try {
      await deleteRecurring(r.id);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete"));
    }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Add Recurring
        </button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : rules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-14">
            No recurring expenses. Add rent, subscriptions or bills to log them automatically.
          </p>
        ) : (
          <div className="space-y-0.5 p-2">
            {rules.map((r) => (
              <div
                key={r.id}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors ${r.active ? "" : "opacity-50"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">
                    {r.description || r.category}
                    <span className="ml-2 text-[10px] uppercase tracking-wide text-indigo-400">{r.frequency}</span>
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {r.category} · {PAYMENT_METHOD_LABELS[r.paymentMethod]} ·{" "}
                    {r.active ? `next ${format(new Date(r.nextRunAt), "MMM d, yyyy")}` : "paused"}
                  </p>
                </div>
                <p className="text-sm font-semibold text-white shrink-0">
                  {r.currency} {formatMoney(r.amount)}
                </p>
                <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                  <IconButton title={r.active ? "Pause" : "Resume"} path={r.active ? PAUSE_ICON : PLAY_ICON} onClick={() => toggle(r)} />
                  <IconButton title="Edit" path={EDIT_ICON} onClick={() => openEdit(r)} />
                  <IconButton title="Delete" path={DELETE_ICON} danger onClick={() => handleDelete(r)} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {form && (
        <Modal
          title={editingId ? "Edit recurring expense" : "Add recurring expense"}
          subtitle={editingId ? "Changes apply to future occurrences" : "Past dates since the start are logged right away"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Amount">
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
            <Field label="Description">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Rent"
                className={inputClasses}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className={inputClasses}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Repeats">
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as RecurringFrequency })}
                  className={inputClasses}
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>
                      {f.charAt(0) + f.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Payment Method">
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
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start">
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className={inputClasses}
                />
              </Field>
              <Field label="End (optional)">
                <input
                  type="date"
                  min={form.startDate}
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  className={inputClasses}
                />
              </Field>
            </div>
            <FormActions saving={saving} onCancel={() => setForm(null)} />
          </form>
        </Modal>
      )}
    </>
  );
}
