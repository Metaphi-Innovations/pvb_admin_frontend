/**
 * Dashboard-only period helpers (component-level, not global shell).
 */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "this_quarter"
  | "this_year"
  | "previous_month"
  | "previous_year"
  | "custom";

export type AsOnPreset = "as_on_today" | "as_on_yesterday" | "month_end" | "custom_as_on";

export const COMPONENT_PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
  { value: "previous_month", label: "Previous Month" },
  { value: "previous_year", label: "Previous Year" },
  { value: "custom", label: "Custom" },
];

export const AS_ON_OPTIONS: { value: AsOnPreset; label: string }[] = [
  { value: "as_on_today", label: "As On Today" },
  { value: "as_on_yesterday", label: "As On Yesterday" },
  { value: "month_end", label: "Month End" },
  { value: "custom_as_on", label: "Custom As On Date" },
];

/** @deprecated — kept for Sales migration compatibility */
export const PERIOD_PRESET_OPTIONS = COMPONENT_PERIOD_OPTIONS;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

export function formatDisplayDate(iso: string): string {
  const d = parseIsoDate(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? 6 : day - 1;
  x.setDate(x.getDate() - diff);
  return x;
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

/** Demo “today” locked for stable mock data */
export const DEMO_TODAY = new Date(2026, 6, 29);

export function resolvePeriodRange(
  preset: PeriodPreset,
  customFrom?: string,
  customTo?: string,
  today: Date = DEMO_TODAY,
): { fromDate: string; toDate: string } {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (preset === "custom") {
    const from = customFrom || toIsoDate(t);
    const to = customTo || toIsoDate(t);
    return from <= to ? { fromDate: from, toDate: to } : { fromDate: to, toDate: from };
  }

  if (preset === "today") {
    const iso = toIsoDate(t);
    return { fromDate: iso, toDate: iso };
  }

  if (preset === "yesterday") {
    const y = new Date(t);
    y.setDate(y.getDate() - 1);
    const iso = toIsoDate(y);
    return { fromDate: iso, toDate: iso };
  }

  if (preset === "this_week") {
    return { fromDate: toIsoDate(startOfWeek(t)), toDate: toIsoDate(t) };
  }

  if (preset === "this_month") {
    return { fromDate: toIsoDate(new Date(t.getFullYear(), t.getMonth(), 1)), toDate: toIsoDate(t) };
  }

  if (preset === "this_quarter") {
    return { fromDate: toIsoDate(startOfQuarter(t)), toDate: toIsoDate(t) };
  }

  if (preset === "this_year") {
    return { fromDate: toIsoDate(new Date(t.getFullYear(), 0, 1)), toDate: toIsoDate(t) };
  }

  if (preset === "previous_month") {
    const start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    const end = new Date(t.getFullYear(), t.getMonth(), 0);
    return { fromDate: toIsoDate(start), toDate: toIsoDate(end) };
  }

  // previous_year
  const y = t.getFullYear() - 1;
  return { fromDate: `${y}-01-01`, toDate: `${y}-12-31` };
}

/** Legacy signature used by older Sales mock paths */
export function resolvePeriodRangeLegacy(
  preset: PeriodPreset,
  _financialYear: string,
  customFrom?: string,
  customTo?: string,
  today?: Date,
) {
  return resolvePeriodRange(preset, customFrom, customTo, today);
}

export function resolveAsOnDate(
  preset: AsOnPreset,
  customDate?: string,
  today: Date = DEMO_TODAY,
): string {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === "as_on_today") return toIsoDate(t);
  if (preset === "as_on_yesterday") {
    const y = new Date(t);
    y.setDate(y.getDate() - 1);
    return toIsoDate(y);
  }
  if (preset === "month_end") {
    return toIsoDate(new Date(t.getFullYear(), t.getMonth() + 1, 0));
  }
  return customDate || toIsoDate(t);
}

export function daysInRange(fromDate: string, toDate: string): number {
  const a = parseIsoDate(fromDate).getTime();
  const b = parseIsoDate(toDate).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export function periodActivityScale(fromDate: string, toDate: string): number {
  const days = daysInRange(fromDate, toDate);
  if (days <= 1) return 1;
  if (days <= 7) return 1.4;
  if (days <= 31) return 2.2;
  if (days <= 100) return 3.5;
  return 5;
}

export function scaleCount(base: number, scale: number): number {
  return Math.max(0, Math.round(base * scale));
}
