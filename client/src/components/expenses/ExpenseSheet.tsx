import { useState, type FormEvent } from "react";
import { format, subDays } from "date-fns";
import toast from "react-hot-toast";
import type { BudgetWarning, Expense, ExpenseCategoryItem, Income, PaymentMethod } from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import { createExpense, createIncome, deleteExpense, deleteIncome, updateExpense, updateIncome } from "../../api/expenses";
import { BottomSheet } from "./BottomSheet";
import { categoryLabel, categoryStyle } from "./categoryStyle";
import { Chip, DangerButton, Field, PrimaryButton, Segmented, errorMessage, formatMoney, inputClasses } from "./ui";

export type SheetTarget =
  | { kind: "expense"; expense?: Expense }
  | { kind: "income"; income?: Income };

type Kind = SheetTarget["kind"];

const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];
const INCOME_SOURCES = ["Salary", "Freelance", "Business", "Gift", "Other"];

function showBudgetWarnings(warnings: BudgetWarning[]) {
  for (const w of warnings) {
    const name = w.category ? categoryLabel(w.category) : "Overall";
    const msg = w.exceeded
      ? `${name} budget exceeded: ${formatMoney(w.spent)} / ${formatMoney(w.limit)}`
      : `${name} budget at ${w.percentUsed}% (${formatMoney(w.spent)} / ${formatMoney(w.limit)})`;
    toast(msg, { icon: w.exceeded ? "🚨" : "⚠️", duration: 5000 });
  }
}

interface FormState {
  amount: string;
  date: string;
  note: string;
  categoryId: string;
  paymentMethod: PaymentMethod;
  source: string;
}

function initialForm(target: SheetTarget, categories: ExpenseCategoryItem[]): FormState {
  const today = format(new Date(), "yyyy-MM-dd");
  const base: FormState = {
    amount: "",
    date: today,
    note: "",
    categoryId: categories[0]?.id ?? "",
    paymentMethod: "CASH",
    source: "",
  };
  if (target.kind === "expense" && target.expense) {
    const e = target.expense;
    return { ...base, amount: e.amount, date: e.spentAt, note: e.description ?? "", categoryId: e.categoryId, paymentMethod: e.paymentMethod };
  }
  if (target.kind === "income" && target.income) {
    const i = target.income;
    return { ...base, amount: i.amount, date: i.receivedAt, note: i.description ?? "", source: i.source };
  }
  return base;
}

export function ExpenseSheet({
  target,
  categories,
  onClose,
  onSaved,
}: {
  target: SheetTarget;
  categories: ExpenseCategoryItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editingId = target.kind === "expense" ? target.expense?.id : target.income?.id;
  const currency = (target.kind === "expense" ? target.expense?.currency : target.income?.currency) ?? "MMK";
  const [kind, setKind] = useState<Kind>(target.kind);
  const [form, setForm] = useState<FormState>(() => initialForm(target, categories));
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const isIncome = kind === "income";
  const valid = Number(form.amount) > 0 && (isIncome ? form.source.trim() !== "" : form.categoryId !== "");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      if (isIncome) {
        const input = { amount: form.amount, source: form.source.trim(), receivedAt: form.date, description: form.note || null };
        if (editingId) await updateIncome(editingId, input);
        else await createIncome(input);
        toast.success(editingId ? "Income updated" : "Income added");
      } else {
        const input = {
          amount: form.amount,
          categoryId: form.categoryId,
          paymentMethod: form.paymentMethod,
          spentAt: form.date,
          description: form.note || undefined,
        };
        const { budgetWarnings } = editingId ? await updateExpense(editingId, input) : await createExpense(input);
        toast.success(editingId ? "Expense updated" : "Expense added");
        showBudgetWarnings(budgetWarnings);
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to save"));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId || !window.confirm(`Delete this ${kind}?`)) return;
    setBusy(true);
    try {
      if (isIncome) await deleteIncome(editingId);
      else await deleteExpense(editingId);
      toast.success(isIncome ? "Income deleted" : "Expense deleted");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete"));
    } finally {
      setBusy(false);
    }
  };

  const title = editingId ? `Edit ${kind}` : "New transaction";

  return (
    <BottomSheet title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!editingId && (
          <Segmented<Kind>
            value={kind}
            onChange={setKind}
            options={[
              { value: "expense", label: "Expense" },
              { value: "income", label: "Income" },
            ]}
          />
        )}

        <div className="text-center py-2">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-lg font-medium text-gray-500">{currency}</span>
            <input
              autoFocus={!editingId}
              inputMode="decimal"
              aria-label="Amount"
              value={form.amount}
              onChange={(e) => {
                const v = e.target.value.replace(/[^\d.]/g, "");
                if (/^\d*(\.\d{0,2})?$/.test(v)) set({ amount: v });
              }}
              placeholder="0"
              className={`w-48 bg-transparent text-5xl font-bold text-center tabular-nums focus:outline-none placeholder-gray-700 ${
                isIncome ? "text-emerald-400" : "text-white"
              }`}
            />
          </div>
        </div>

        {isIncome ? (
          <Field label="Source">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-2">
              {INCOME_SOURCES.map((s) => (
                <Chip key={s} active={form.source === s} onClick={() => set({ source: s })}>
                  {s}
                </Chip>
              ))}
            </div>
            <input
              maxLength={100}
              value={form.source}
              onChange={(e) => set({ source: e.target.value })}
              placeholder="Or type a source"
              className={inputClasses}
            />
          </Field>
        ) : (
          <>
            <Field label="Category">
              <div className="grid grid-cols-4 gap-2">
                {categories.map((c) => {
                  const style = categoryStyle(c.name);
                  const active = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => set({ categoryId: c.id })}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-2xl border transition-colors ${
                        active ? "border-indigo-500 bg-indigo-500/10" : "border-gray-800 bg-gray-800/40 active:bg-gray-800"
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {style.icon}
                      </span>
                      <span className={`text-[11px] w-full px-1 truncate ${active ? "text-white" : "text-gray-400"}`}>
                        {categoryLabel(c.name)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Paid with">
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {PAYMENT_METHODS.map((m) => (
                  <Chip key={m} active={form.paymentMethod === m} onClick={() => set({ paymentMethod: m })}>
                    {PAYMENT_METHOD_LABELS[m]}
                  </Chip>
                ))}
              </div>
            </Field>
          </>
        )}

        <Field label="Date">
          <div className="flex gap-2 items-center">
            <Chip active={form.date === today} onClick={() => set({ date: today })}>
              Today
            </Chip>
            <Chip active={form.date === yesterday} onClick={() => set({ date: yesterday })}>
              Yesterday
            </Chip>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => set({ date: e.target.value })}
              className={`${inputClasses} !py-2 !text-sm`}
            />
          </div>
        </Field>

        <Field label="Note">
          <input
            maxLength={500}
            value={form.note}
            onChange={(e) => set({ note: e.target.value })}
            placeholder={isIncome ? "October salary" : "Lunch with team"}
            className={inputClasses}
          />
        </Field>

        <div className="pt-1 space-y-1">
          <PrimaryButton disabled={busy || !valid} tone={isIncome ? "emerald" : "indigo"}>
            {busy ? "Saving…" : editingId ? "Save changes" : `Add ${kind}`}
          </PrimaryButton>
          {editingId && (
            <DangerButton onClick={handleDelete} disabled={busy}>
              Delete {kind}
            </DangerButton>
          )}
        </div>
      </form>
    </BottomSheet>
  );
}
