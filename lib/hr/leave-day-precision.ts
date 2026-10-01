/**
 * Shared leave-day quantity helpers — 0.25 day precision.
 * Avoid scattered floating-point comparisons across Leave UI.
 */

const STEP = 0.25;
const SCALE = 4; // 1 / 0.25

/** Normalize to nearest 0.25 using integer scaling (avoids float drift). */
export function normalizeLeaveDays(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const scaled = Math.round(raw * SCALE);
  return scaled / SCALE;
}

/** True when days > 0 and exactly a multiple of 0.25. */
export function isValidLeaveDayQuantity(raw: number): boolean {
  if (!Number.isFinite(raw) || raw <= 0) return false;
  const n = normalizeLeaveDays(raw);
  if (Math.abs(n - raw) > 1e-9) return false;
  return Math.abs(n * SCALE - Math.round(n * SCALE)) < 1e-9;
}

export function clampLeaveDays(raw: number, min: number, max: number): number {
  const n = normalizeLeaveDays(raw);
  const lo = normalizeLeaveDays(min);
  const hi = normalizeLeaveDays(max);
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/** Compact display: 6, 2.5, 1.75 — not 6.00 */
export function formatLeaveDays(raw: number | null | undefined): string {
  if (raw == null || !Number.isFinite(raw)) return "—";
  const n = normalizeLeaveDays(raw);
  if (Number.isInteger(n)) return String(n);
  // trim trailing zeros after decimal
  return String(n);
}

export const LEAVE_DAY_PORTION_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Not Approved" },
  { value: 0.25, label: "0.25 day" },
  { value: 0.5, label: "0.5 day" },
  { value: 0.75, label: "0.75 day" },
  { value: 1, label: "Full Day" },
];

/** Inclusive calendar dates from → to (YYYY-MM-DD). */
export function enumerateLeaveDates(fromDate: string, toDate: string): string[] {
  const from = fromDate.slice(0, 10);
  const to = toDate.slice(0, 10);
  if (!from || !to || to < from) return [];
  const out: string[] = [];
  const cur = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function sumLeavePortions(
  portions: { date: string; quantity: number }[],
): number {
  return normalizeLeaveDays(
    portions.reduce((s, p) => s + (p.quantity > 0 ? p.quantity : 0), 0),
  );
}
