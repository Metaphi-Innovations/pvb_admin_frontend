import type { FinancialYear } from "@/lib/fy-store";
import type { StockDateMode, StockPositionFilters } from "../types/stock-position";

export type StockDatePresetId =
  | "today"
  | "current_fy"
  | "previous_fy"
  | "custom"
  | `month-${string}`;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseFyStartYear(codeOrId: string): number {
  return parseInt(codeOrId.split("-")[0], 10);
}

function fyIsoRange(fy: FinancialYear | string): { from: string; to: string } {
  if (typeof fy === "object" && fy.startDate && fy.endDate) {
    return {
      from: String(fy.startDate).slice(0, 10),
      to: String(fy.endDate).slice(0, 10),
    };
  }
  const key = typeof fy === "object" ? fy.code || fy.id : fy;
  const y = parseFyStartYear(key);
  if (!Number.isFinite(y) || y < 1900) {
    const now = new Date();
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
  }
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return d.toISOString().slice(0, 10);
}

function monthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Months in selected FY from Apr through today (newest first). */
function monthsInFyUpToToday(fy: FinancialYear, today: string): { value: string; label: string }[] {
  const range = fyIsoRange(fy);
  const end = today < range.to ? today : range.to;
  if (end < range.from) return [];

  const result: { value: string; label: string }[] = [];
  let y = parseInt(range.from.slice(0, 4), 10);
  let m = parseInt(range.from.slice(5, 7), 10);
  const endY = parseInt(end.slice(0, 4), 10);
  const endM = parseInt(end.slice(5, 7), 10);

  while (y < endY || (y === endY && m <= endM)) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    result.push({ value: `month-${key}`, label: monthLabel(key) });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  return result.reverse();
}

function previousFy(selectedFyId: string, allFYs: FinancialYear[]): FinancialYear | null {
  const idx = allFYs.findIndex((f) => f.id === selectedFyId);
  if (idx <= 0) return null;
  return allFYs[idx - 1];
}

export function buildStockDatePresetOptions(
  selectedFY: FinancialYear,
  today: string,
  allFYs: FinancialYear[],
) {
  const options: { value: string; label: string }[] = [
    { value: "today", label: "Today's Position" },
    ...monthsInFyUpToToday(selectedFY, today),
    { value: "current_fy", label: "Current Financial Year" },
  ];

  if (previousFy(selectedFY.id, allFYs)) {
    options.push({ value: "previous_fy", label: "Previous Financial Year" });
  }

  options.push({ value: "custom", label: "Custom Date" });
  return options;
}

export function getStockDatePresetLabel(
  presetId: string,
  options: { value: string; label: string }[],
): string {
  return options.find((o) => o.value === presetId)?.label ?? "Custom Date";
}

export function resolveStockDatePreset(
  presetId: string,
  today: string,
  selectedFY: FinancialYear,
  allFYs: FinancialYear[],
): Pick<StockPositionFilters, "dateMode" | "asOnDate" | "fromDate" | "toDate"> | null {
  if (presetId === "custom") return null;

  if (presetId === "today") {
    return { dateMode: "single", asOnDate: today, fromDate: today, toDate: today };
  }

  if (presetId === "current_fy") {
    const fy = fyIsoRange(selectedFY);
    const toDate = today < fy.to ? today : fy.to;
    return { dateMode: "range", asOnDate: toDate, fromDate: fy.from, toDate };
  }

  if (presetId === "previous_fy") {
    const prev = previousFy(selectedFY.id, allFYs);
    if (!prev) return null;
    const fy = fyIsoRange(prev);
    return { dateMode: "range", asOnDate: fy.to, fromDate: fy.from, toDate: fy.to };
  }

  if (presetId.startsWith("month-")) {
    const ym = presetId.slice(6);
    const [y, mo] = ym.split("-").map(Number);
    const fromDate = `${y}-${String(mo).padStart(2, "0")}-01`;
    const monthEnd = lastDayOfMonth(y, mo);
    const toDate = monthEnd > today ? today : monthEnd;
    const dateMode: StockDateMode = fromDate === toDate ? "single" : "range";
    return {
      dateMode,
      asOnDate: toDate,
      fromDate,
      toDate,
    };
  }

  return null;
}

export function applyCustomStockDates(
  fromDate: string,
  toDate: string,
): Pick<StockPositionFilters, "dateMode" | "asOnDate" | "fromDate" | "toDate" | "datePreset"> {
  let from = fromDate;
  let to = toDate;
  if (from > to) [from, to] = [to, from];
  const dateMode: StockDateMode = from === to ? "single" : "range";
  return {
    datePreset: "custom",
    dateMode,
    asOnDate: to,
    fromDate: from,
    toDate: to,
  };
}
