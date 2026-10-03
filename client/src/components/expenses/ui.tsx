import type { ReactNode } from "react";

export const inputClasses =
  "w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors";

export function formatMoney(amount: string) {
  return Number(amount).toFixed(2);
}

export function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

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

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h2 className="text-white font-semibold text-base mb-1">{title}</h2>
        {subtitle && <p className="text-gray-400 text-xs mb-5">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

export function FormActions({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-3 pt-1">
      <button
        type="button"
        onClick={onCancel}
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
  );
}

export function IconButton({
  title,
  onClick,
  danger,
  path,
}: {
  title: string;
  onClick: () => void;
  danger?: boolean;
  path: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 text-gray-400 ${danger ? "hover:text-red-400" : "hover:text-white"} hover:bg-gray-700 rounded-lg transition-colors`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d={path} />
      </svg>
    </button>
  );
}

export const EDIT_ICON =
  "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z";
export const DELETE_ICON = "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z";
export const PAUSE_ICON = "M6 19h4V5H6v14zm8-14v14h4V5h-4z";
export const PLAY_ICON = "M8 5v14l11-7z";

export function ProgressBar({ percent, danger, warn }: { percent: number; danger?: boolean; warn?: boolean }) {
  const color = danger ? "bg-red-500" : warn ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, percent)}%` }} />
    </div>
  );
}
