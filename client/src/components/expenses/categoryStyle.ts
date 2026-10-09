export interface CategoryStyle {
  icon: string;
  /** Hex color used for charts and icon tints. */
  color: string;
}

const SEEDED: Record<string, CategoryStyle> = {
  FOOD: { icon: "🍜", color: "#818cf8" },
  TRANSPORT: { icon: "🚌", color: "#a78bfa" },
  HOUSING: { icon: "🏠", color: "#60a5fa" },
  UTILITIES: { icon: "💡", color: "#2dd4bf" },
  HEALTHCARE: { icon: "💊", color: "#fb7185" },
  ENTERTAINMENT: { icon: "🎬", color: "#f472b6" },
  SHOPPING: { icon: "🛍️", color: "#fbbf24" },
  EDUCATION: { icon: "📚", color: "#22d3ee" },
  TRAVEL: { icon: "✈️", color: "#34d399" },
  SAVINGS: { icon: "🐷", color: "#a3e635" },
  OTHER: { icon: "📦", color: "#9ca3af" },
};

// Custom user categories get a stable color derived from their name.
const FALLBACK_COLORS = ["#f97316", "#e879f9", "#38bdf8", "#4ade80", "#facc15", "#f87171", "#c084fc", "#5eead4"];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function categoryStyle(name: string | null | undefined): CategoryStyle {
  if (!name) return SEEDED.OTHER;
  return SEEDED[name] ?? { icon: "🏷️", color: FALLBACK_COLORS[hash(name) % FALLBACK_COLORS.length] };
}

export function categoryLabel(name: string) {
  return name.charAt(0) + name.slice(1).toLowerCase();
}
