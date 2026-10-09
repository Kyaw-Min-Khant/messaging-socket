import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { categoryLabel, categoryStyle } from "../categoryStyle";
import { formatMoney } from "../ui";

interface Slice {
  category: string;
  total: string;
  count: number;
}

export function CategoryDonut({
  data,
  total,
  legendLimit,
}: {
  data: Slice[];
  total: number;
  /** Show only the top N categories in the legend. */
  legendLimit?: number;
}) {
  const sorted = [...data].sort((a, b) => Number(b.total) - Number(a.total));
  const chartData = sorted.map((s) => ({ name: s.category, value: Number(s.total) }));
  const legend = legendLimit ? sorted.slice(0, legendLimit) : sorted;

  return (
    <div>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={chartData.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((d) => (
                <Cell key={d.name} fill={categoryStyle(d.name).color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[11px] uppercase tracking-wider text-gray-500">Spent</p>
          <p className="text-xl font-bold text-white tabular-nums">{formatMoney(total)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {legend.map((s) => {
          const pct = total ? Math.round((Number(s.total) / total) * 100) : 0;
          return (
            <div key={s.category} className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryStyle(s.category).color }} />
              <span className="flex-1 text-sm text-gray-300 truncate">
                {categoryStyle(s.category).icon} {categoryLabel(s.category)}
              </span>
              <span className="text-xs text-gray-500 tabular-nums">{pct}%</span>
              <span className="w-24 text-right text-sm font-medium text-white tabular-nums">{formatMoney(s.total)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
