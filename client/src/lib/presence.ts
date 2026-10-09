import { formatDistanceToNow } from "date-fns";

// A friend counts as online while connected, and for this long after they
// were last seen — so a brief disconnect (refresh, network blip) doesn't
// flicker them to offline.
export const ONLINE_GRACE_MS = 3 * 60 * 1000;

export function seenRecently(lastSeen: string | number | undefined, now: number): boolean {
  if (lastSeen === undefined) return false;
  const t = typeof lastSeen === "number" ? lastSeen : new Date(lastSeen).getTime();
  if (isNaN(t)) return false;
  const elapsed = now - t;
  return elapsed >= 0 ? elapsed <= ONLINE_GRACE_MS : true;
}

/** e.g. "Active 12 minutes ago", or "Offline" when we have no usable time. */
export function lastSeenLabel(prefix: string, lastSeen: string | undefined): string {
  const date = lastSeen ? new Date(lastSeen) : null;
  if (!date || isNaN(date.getTime())) return "Offline";
  return `${prefix} ${formatDistanceToNow(date, { addSuffix: true })}`;
}
