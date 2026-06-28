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

function parseFyStartYear(fyId: string): number {
  return parseInt(fyId.split("-")[0], 10);
}

function fyIsoRange(fyId: string): { from: string; to: string } {
  const y = parseFyStartYear(fyId);
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
function monthsInFyUpToToday(fyId: string, today: string): { value: string; label: string }[] {
  const fy = fyIsoRange(fyId);
  const end = today < fy.to ? today : fy.to;
  if (end < fy.from) return [];

  const result: { value: string; label: string }[] = [];
  let y = parseInt(fy.from.slice(0, 4), 10);
  let m = parseInt(fy.from.slice(5, 7), 10);
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

function previousFyId(selectedFyId: string, allFYs: FinancialYear[]): string | null {
  const idx = allFYs.findIndex((f) => f.id === selectedFyId);
  if (idx <= 0) return null;
  return allFYs[idx - 1].id;
}

export function buildStockDatePresetOptions(fyId: string, today: string, allFYs: FinancialYear[]) {
  const options: { value: string; label: string }[] = [
    { value: "today", label: "Today's Position" },
    ...monthsInFyUpToToday(fyId, today),
    { value: "current_fy", label: "Current Financial Year" },
  ];

  if (previousFyId(fyId, allFYs)) {
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
  selectedFyId: string,
  allFYs: FinancialYear[],
): Pick<StockPositionFilters, "dateMode" | "asOnDate" | "fromDate" | "toDate"> | null {
  if (presetId === "custom") return null;

  if (presetId === "today") {
    return { dateMode: "single", asOnDate: today, fromDate: today, toDate: today };
  }

  if (presetId === "current_fy") {
    const fy = fyIsoRange(selectedFyId);
    const toDate = today < fy.to ? today : fy.to;
    return { dateMode: "range", asOnDate: toDate, fromDate: fy.from, toDate };
  }

  if (presetId === "previous_fy") {
    const prevId = previousFyId(selectedFyId, allFYs);
    if (!prevId) return null;
    const fy = fyIsoRange(prevId);
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
