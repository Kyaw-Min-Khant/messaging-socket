import type { ReactNode } from "react";
import { addMonths, endOfMonth, format, parseISO } from "date-fns";
import { categoryStyle } from "./categoryStyle";

// text-base keeps iOS Safari from zooming into focused inputs.
export const inputClasses =
  "w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

export function formatMoney(amount: string | number) {
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatAmount(amount: string, currency: string) {
  return `${currency} ${formatMoney(amount)}`;
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

// ── Month helpers (month is "yyyy-MM") ───────────────────────────────────────

export const currentMonth = () => format(new Date(), "yyyy-MM");

export function shiftMonth(month: string, delta: number) {
  return format(addMonths(parseISO(`${month}-01`), delta), "yyyy-MM");
}

export function monthRange(month: string) {
  const start = parseISO(`${month}-01`);
  return { startDate: format(start, "yyyy-MM-dd"), endDate: format(endOfMonth(start), "yyyy-MM-dd") };
}

// ── Primitives ───────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-gray-900 border border-gray-800 rounded-2xl ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
        active
          ? "bg-indigo-600 border-indigo-500 text-white"
          : "bg-gray-900 border-gray-800 text-gray-300 active:bg-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex p-1 bg-gray-800 rounded-xl">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
            value === o.value ? "bg-gray-950 text-white shadow" : "text-gray-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CategoryIcon({ category, size = "md" }: { category: string | null; size?: "sm" | "md" }) {
  const { icon, color } = categoryStyle(category);
  const box = size === "sm" ? "w-8 h-8 text-base" : "w-11 h-11 text-xl";
  return (
    <div
      className={`${box} rounded-2xl flex items-center justify-center shrink-0`}
      style={{ backgroundColor: `${color}26` }}
    >
      <span aria-hidden>{icon}</span>
    </div>
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
  tone = "indigo",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  tone?: "indigo" | "emerald";
}) {
  const color = tone === "emerald" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-indigo-500";
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`w-full py-3.5 rounded-2xl ${color} text-white text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full py-3 rounded-2xl text-red-400 text-sm font-medium hover:bg-red-500/10 disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export function EmptyState({ icon, title, action }: { icon: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <span className="text-4xl mb-3 opacity-80" aria-hidden>
        {icon}
      </span>
      <p className="text-sm text-gray-400">{title}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ProgressBar({ percent, danger, warn }: { percent: number; danger?: boolean; warn?: boolean }) {
  const color = danger ? "bg-red-500" : warn ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}
