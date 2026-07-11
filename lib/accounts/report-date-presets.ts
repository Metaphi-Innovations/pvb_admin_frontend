export type DateRangePresetId =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "this_financial_year"
  | "all_transactions"
  | "custom";

export const DATE_RANGE_PRESET_OPTIONS: { id: DateRangePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "this_quarter", label: "This Quarter" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

/** Day Book and similar reports — includes FY-wide and unfiltered presets. */
export const DAY_BOOK_DATE_RANGE_PRESET_OPTIONS: { id: DateRangePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "this_financial_year", label: "This Financial Year" },
  { id: "all_transactions", label: "All Transactions" },
  { id: "custom", label: "Custom Date Range" },
];

/** Presets used on Pending Invoice & Sales Invoice listing pages. */
export const INVOICE_LISTING_DATE_PRESETS: { id: DateRangePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This Week" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "custom", label: "Custom Range" },
];

import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

function startOfQuarter(date: Date): Date {
  const d = new Date(date);
  const quarter = Math.floor(d.getMonth() / 3);
  d.setMonth(quarter * 3, 1);
  return d;
}

export function resolveDateRangePreset(
  preset: DateRangePresetId,
  refDate = new Date(),
): { from: string; to: string } {
  const to = formatIsoDate(refDate);

  switch (preset) {
    case "today":
      return { from: to, to };
    case "this_week":
      return { from: formatIsoDate(startOfWeek(refDate)), to };
    case "this_month": {
      const d = new Date(refDate);
      d.setDate(1);
      return { from: formatIsoDate(d), to };
    }
    case "last_month": {
      const start = new Date(refDate);
      start.setMonth(start.getMonth() - 1, 1);
      const end = new Date(refDate);
      end.setDate(0);
      return { from: formatIsoDate(start), to: formatIsoDate(end) };
    }
    case "this_quarter":
      return { from: formatIsoDate(startOfQuarter(refDate)), to };
    case "this_year": {
      const d = new Date(refDate);
      d.setMonth(0, 1);
      return { from: formatIsoDate(d), to };
    }
    case "this_financial_year":
      return { from: demoFinancialYearStart(refDate), to };
    case "all_transactions":
      return { from: "", to: "" };
    case "custom":
    default:
      return { from: to, to };
  }
}

export function defaultDateRangeState(refDate = new Date()) {
  const preset: DateRangePresetId = "this_month";
  const { from, to } = resolveDateRangePreset(preset, refDate);
  return { preset, from, to };
}

export function defaultAsOnDate(refDate = new Date()): string {
  return formatIsoDate(refDate);
}
