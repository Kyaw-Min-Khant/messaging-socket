import { eachDayOfInterval, format, parseISO } from "date-fns";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyTotal } from "../../../types";
import { formatMoney, monthRange } from "../ui";

/** Spending per day across the whole month, with zero-days filled in. */
export function DailyBars({ month, data }: { month: string; data: DailyTotal[] }) {
  const totals = new Map(data.map((d) => [d.date, Number(d.total)]));
  const { startDate, endDate } = monthRange(month);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return { key, day: format(d, "d"), total: totals.get(key) ?? 0 };
  });

  return (
    <div className="h-44 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            interval={6}
            tick={{ fill: "#6b7280", fontSize: 11 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: "#1f2937" }}
            contentStyle={{ background: "#111827", border: "1px solid #374151", borderRadius: 12, fontSize: 12 }}
            labelStyle={{ color: "#9ca3af" }}
            itemStyle={{ color: "#f3f4f6" }}
            labelFormatter={(_, payload) =>
              payload?.[0] ? format(parseISO(payload[0].payload.key), "EEE, MMM d") : ""
            }
            formatter={(v: number) => [formatMoney(v), "Spent"]}
          />
          <Bar dataKey="total" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
