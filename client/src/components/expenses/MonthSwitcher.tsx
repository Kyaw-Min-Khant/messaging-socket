import { format, parseISO } from "date-fns";
import { currentMonth, shiftMonth } from "./ui";

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const isCurrent = month >= currentMonth();
  const btn = "p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:hover:bg-transparent";
  return (
    <div className="flex items-center justify-between">
      <button onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month" className={btn}>
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <button
        onClick={() => onChange(currentMonth())}
        className="text-sm font-semibold text-white px-3 py-1 rounded-full hover:bg-gray-800"
        title="Jump to this month"
      >
        {format(parseISO(`${month}-01`), "MMMM yyyy")}
      </button>
      <button
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={isCurrent}
        aria-label="Next month"
        className={btn}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>
  );
}
