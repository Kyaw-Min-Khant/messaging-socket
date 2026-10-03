import { useCallback, useEffect, useState, type FormEvent } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import type { Income, Pagination } from "../../types";
import { createIncome, deleteIncome, getIncome, updateIncome } from "../../api/expenses";
import {
  Card,
  DELETE_ICON,
  EDIT_ICON,
  Field,
  FormActions,
  IconButton,
  Modal,
  Spinner,
  errorMessage,
  formatMoney,
  inputClasses,
} from "./ui";

interface IncomeForm {
  amount: string;
  source: string;
  receivedAt: string;
  description: string;
}

const emptyForm = (): IncomeForm => ({
  amount: "",
  source: "",
  receivedAt: format(new Date(), "yyyy-MM-dd"),
  description: "",
});

export function IncomeTab({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [items, setItems] = useState<Income[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<IncomeForm | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getIncome({ startDate: startDate || undefined, endDate: endDate || undefined, page, limit: 20 })
      .then((r) => {
        setItems(r.income);
        setPagination(r.pagination);
      })
      .catch((err) => toast.error(errorMessage(err, "Failed to load income")))
      .finally(() => setLoading(false));
  }, [startDate, endDate, page]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [startDate, endDate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const input = { ...form, description: form.description || null };
      if (editingId) await updateIncome(editingId, input);
      else await createIncome(input);
      toast.success(editingId ? "Income updated" : "Income added");
      setForm(null);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save income"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (income: Income) => {
    if (!window.confirm("Delete this income entry?")) return;
    try {
      await deleteIncome(income.id);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete income"));
    }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => {
            setEditingId(null);
            setForm(emptyForm());
          }}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          + Add Income
        </button>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-14">No income recorded for this range</p>
        ) : (
          <div className="space-y-0.5 p-2">
            {items.map((income) => (
              <div
                key={income.id}
                className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{income.source}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {format(new Date(income.receivedAt), "MMM d, yyyy")}
                    {income.description ? ` · ${income.description}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-emerald-400 shrink-0">
                  +{income.currency} {formatMoney(income.amount)}
                </p>
                <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                  <IconButton
                    title="Edit"
                    path={EDIT_ICON}
                    onClick={() => {
                      setEditingId(income.id);
                      setForm({
                        amount: income.amount,
                        source: income.source,
                        receivedAt: income.receivedAt,
                        description: income.description ?? "",
                      });
                    }}
                  />
                  <IconButton title="Delete" path={DELETE_ICON} danger onClick={() => handleDelete(income)} />
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
              className="text-xs text-gray-400 hover:text-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs text-gray-400 hover:text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </Card>

      {form && (
        <Modal title={editingId ? "Edit income" : "Add income"} subtitle="Salary, freelance, gifts…">
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
            <Field label="Source">
              <input
                required
                maxLength={100}
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                placeholder="Salary"
                className={inputClasses}
              />
            </Field>
            <Field label="Date">
              <input
                type="date"
                required
                value={form.receivedAt}
                onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
                className={inputClasses}
              />
            </Field>
            <Field label="Description (optional)">
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
