// Pure helpers for POST /expenses/scan: image type sniffing and model answer → draft.

const PAYMENT_METHODS = ["CASH", "KBZ_PAY", "AYA_PAY", "ONLINE_PAYMENT"];

export interface SlipDraft {
  amount: string | null;
  categoryId: string | null;
  category: string | null;
  paymentMethod: string | null;
  spentAt: string | null;
  description: string | null;
}

/** Image type from the first bytes of its base64, or null if it isn't one we send to the model. */
export function sniffImageMime(base64: string): string | null {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  return null;
}

/**
 * Keeps only what is valid; anything else becomes null so the app leaves that field alone.
 * `latestDate` is the newest spentAt accepted, as YYYY-MM-DD.
 */
export function toDraft(
  answer: Record<string, unknown>,
  categories: { id: string; name: string }[],
  latestDate: string,
): SlipDraft {
  const { amount, category, paymentMethod, date, note } = answer;
  const minor = typeof amount === "number" && Number.isFinite(amount) ? Math.round(amount * 100) : 0;
  const match =
    typeof category === "string"
      ? categories.find((c) => c.name.toUpperCase() === category.trim().toUpperCase())
      : undefined;
  // Round-tripping through Date rejects impossible days like 2026-02-31.
  const validDate =
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !isNaN(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date &&
    date <= latestDate;
  const description = typeof note === "string" ? note.trim().slice(0, 500) : "";
  return {
    amount: minor > 0 ? (minor / 100).toFixed(2) : null,
    categoryId: match?.id ?? null,
    category: match?.name ?? null,
    paymentMethod:
      typeof paymentMethod === "string" && PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : null,
    spentAt: validDate ? date : null,
    description: description || null,
  };
}
