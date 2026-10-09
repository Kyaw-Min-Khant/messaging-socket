import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { Expense } from "../../types";
import { PAYMENT_METHOD_LABELS } from "../../types";
import { categoryLabel } from "./categoryStyle";
import { CategoryIcon, formatMoney } from "./ui";

export function dayLabel(date: string) {
  const d = parseISO(date);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, MMM d");
}

export interface DayGroup {
  date: string;
  total: number;
  items: Expense[];
}

/** Groups expenses (already sorted newest first) by their spentAt day. */
export function groupByDate(expenses: Expense[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const e of expenses) {
    let g = groups[groups.length - 1];
    if (!g || g.date !== e.spentAt) {
      g = { date: e.spentAt, total: 0, items: [] };
      groups.push(g);
    }
    g.items.push(e);
    g.total += Number(e.amount);
  }
  return groups;
}

export function TransactionRow({
  expense,
  onClick,
  showDate,
}: {
  expense: Expense;
  onClick: () => void;
  showDate?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left hover:bg-gray-800/60 active:bg-gray-800 transition-colors"
    >
      <CategoryIcon category={expense.category} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-medium text-gray-100 truncate">
          {expense.description || categoryLabel(expense.category)}
        </p>
        <p className="text-xs text-gray-500 truncate">
          {showDate ? dayLabel(expense.spentAt) : categoryLabel(expense.category)} ·{" "}
          {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
          {expense.recurringId && <span className="text-indigo-400"> · ↻ recurring</span>}
        </p>
      </div>
      <p className="text-[15px] font-semibold text-white shrink-0 tabular-nums">−{formatMoney(expense.amount)}</p>
    </button>
  );
}
