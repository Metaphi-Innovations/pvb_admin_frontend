import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
  ColumnValueOption,
  DateFilterPreset,
  TextFilterOperator,
} from "./column-filter-types";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

function normStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function normLower(v: unknown): string {
  return normStr(v).toLowerCase();
}

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/[₹,\s]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parse user-entered amount filter text (commas, currency symbols). */
export function parseFilterAmountInput(raw: string): number | undefined {
  const n = parseNum(raw);
  return n == null ? undefined : n;
}

function parseBool(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = normLower(v);
  if (["yes", "y", "true", "1", "active"].includes(s)) return true;
  if (["no", "n", "false", "0", "inactive"].includes(s)) return false;
  return null;
}

function isBlank(v: unknown): boolean {
  return v == null || normStr(v) === "" || normStr(v) === "—";
}

function matchText(cell: unknown, filter: AccountsColumnFilterState): boolean {
  const op = filter.textOperator ?? "contains";
  const raw = normStr(cell);
  const lower = raw.toLowerCase();
  const q = (filter.textValue ?? "").trim().toLowerCase();

  if (filter.selectedValues && filter.selectedValues.length > 0) {
    return filter.selectedValues.includes(raw);
  }

  switch (op as TextFilterOperator) {
    case "blank":
      return isBlank(cell);
    case "notBlank":
      return !isBlank(cell);
    case "equals":
      return lower === q;
    case "startsWith":
      return lower.startsWith(q);
    case "endsWith":
      return lower.endsWith(q);
    case "notContains":
      return !lower.includes(q);
    case "contains":
    default:
      return lower.includes(q);
  }
}

function matchNumber(cell: unknown, filter: AccountsColumnFilterState): boolean {
  if (filter.selectedValues && filter.selectedValues.length > 0) {
    const raw = normStr(cell);
    const asNum = parseNum(cell);
    return filter.selectedValues.some(
      (v) => normStr(v) === raw || (asNum != null && normStr(v) === String(asNum)),
    );
  }

  const op = filter.numberOperator ?? "equals";
  const n = parseNum(cell);

  if (op === "blank") return isBlank(cell);
  if (op === "notBlank") return !isBlank(cell);
  if (n == null) return false;

  const v1 = filter.numberValue ?? 0;
  const v2 = filter.numberValue2 ?? v1;

  switch (op) {
    case "equals":
      return Math.abs(n - v1) < 0.005;
    case "gt":
      return n > v1;
    case "lt":
      return n < v1;
    case "between":
      return n >= Math.min(v1, v2) && n <= Math.max(v1, v2);
    default:
      return true;
  }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateRangeForPreset(preset: DateFilterPreset): { from: string; to: string } | null {
  const now = startOfDay(new Date());
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  switch (preset) {
    case "today":
      return { from: fmt(now), to: fmt(now) };
    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: fmt(y), to: fmt(y) };
    }
    case "thisWeek": {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    case "lastWeek": {
      const day = now.getDay();
      const mon = new Date(now);
      mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1) - 7);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: fmt(mon), to: fmt(sun) };
    }
    case "thisMonth": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case "lastMonth": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: fmt(from), to: fmt(to) };
    }
    case "thisFinancialYear":
      return { from: demoFinancialYearStart(now), to: fmt(now) };
    default:
      return null;
  }
}

function matchDate(cell: unknown, filter: AccountsColumnFilterState): boolean {
  const raw = normStr(cell);
  if (!raw) {
    if (filter.textOperator === "blank") return true;
    if (filter.textOperator === "notBlank") return false;
    return false;
  }
  if (filter.textOperator === "blank") return false;
  if (filter.textOperator === "notBlank") return true;

  if (filter.selectedValues && filter.selectedValues.length > 0) {
    const cellDate = raw.slice(0, 10);
    return filter.selectedValues.some((v) => v.slice(0, 10) === cellDate || v === raw);
  }

  const cellDate = raw.slice(0, 10);
  const preset = filter.datePreset ?? "custom";

  if (preset === "before") {
    return filter.dateFrom ? cellDate < filter.dateFrom : true;
  }
  if (preset === "after") {
    return filter.dateFrom ? cellDate > filter.dateFrom : true;
  }
  if (preset === "between" || preset === "custom") {
    const from = filter.dateFrom ?? "";
    const to = filter.dateTo ?? from;
    if (from && cellDate < from) return false;
    if (to && cellDate > to) return false;
    return true;
  }

  const range = dateRangeForPreset(preset);
  if (!range) return true;
  return cellDate >= range.from && cellDate <= range.to;
}

function matchStatus(cell: unknown, filter: AccountsColumnFilterState): boolean {
  const raw = normStr(cell);
  if (!filter.selectedValues || filter.selectedValues.length === 0) return true;
  return filter.selectedValues.some(
    (v) => normLower(v) === normLower(raw) || normLower(v) === normLower(String(cell ?? "").replace(/\s+/g, "_")),
  );
}

function matchBoolean(cell: unknown, filter: AccountsColumnFilterState): boolean {
  if (!filter.selectedValues || filter.selectedValues.length === 0) return true;
  const sel = filter.selectedValues[0];
  if (sel === "all") return true;
  const cellBool = parseBool(cell);
  if (cellBool == null) return false;
  return sel === "yes" ? cellBool : !cellBool;
}

export function isColumnFilterActive(filter: AccountsColumnFilterState | undefined): boolean {
  if (!filter) return false;
  // Excel-style filters: active only when specific values are selected
  return Boolean(filter.selectedValues && filter.selectedValues.length > 0);
}

export function countActiveColumnFilters(filters: AccountsColumnFilters): number {
  return Object.values(filters).filter((f) => isColumnFilterActive(f)).length;
}

function resolveFilterCell<T>(
  row: T,
  columnKey: string,
  filter: AccountsColumnFilterState,
  getCellValue: (row: T, columnKey: string) => unknown,
  getFilterValue?: (row: T, columnKey: string) => unknown,
): unknown {
  const usesDisplayValue =
    filter.type === "text" || filter.type === "status" || filter.type === "select";
  if (usesDisplayValue && getFilterValue) return getFilterValue(row, columnKey);
  return getCellValue(row, columnKey);
}

export function applyAccountsColumnFilters<T>(
  rows: T[],
  filters: AccountsColumnFilters,
  getCellValue: (row: T, columnKey: string) => unknown,
  getFilterValue?: (row: T, columnKey: string) => unknown,
): T[] {
  const active = Object.entries(filters).filter(([, f]) => isColumnFilterActive(f));
  if (active.length === 0) return rows;

  return rows.filter((row) => {
    for (const [key, filter] of active) {
      if (!filter) continue;
      const cell = resolveFilterCell(row, key, filter, getCellValue, getFilterValue);
      let ok = true;
      switch (filter.type) {
        case "text":
          ok = matchText(cell, filter);
          break;
        case "number":
        case "amount":
          ok = matchNumber(cell, filter);
          break;
        case "date":
          ok = matchDate(cell, filter);
          break;
        case "status":
        case "select":
          ok = matchStatus(cell, filter);
          break;
        case "boolean":
          ok = matchBoolean(cell, filter);
          break;
        default:
          ok = true;
      }
      if (!ok) return false;
    }
    return true;
  });
}

export function applyAccountsTopN<T>(
  rows: T[],
  n: number,
  columnKey: string,
  getCellValue: (row: T, columnKey: string) => unknown,
  descending = true,
): T[] {
  const sorted = [...rows].sort((a, b) => {
    const av = parseNum(getCellValue(a, columnKey)) ?? 0;
    const bv = parseNum(getCellValue(b, columnKey)) ?? 0;
    return descending ? bv - av : av - bv;
  });
  const top = new Set(sorted.slice(0, n).map((r) => r));
  return rows.filter((r) => top.has(r));
}

export function collectUniqueColumnValues<T>(
  rows: T[],
  columnKey: string,
  getCellValue: (row: T, columnKey: string) => unknown,
  max = 200,
): string[] {
  return collectColumnValueCounts(rows, columnKey, getCellValue, max).map((o) => o.value);
}

export function collectColumnValueCounts<T>(
  rows: T[],
  columnKey: string,
  getCellValue: (row: T, columnKey: string) => unknown,
  max = 200,
  getFilterValue?: (row: T, columnKey: string) => unknown,
): ColumnValueOption[] {
  const read = getFilterValue ?? getCellValue;
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = normStr(read(row, columnKey));
    if (!v || v === "—") continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
    .slice(0, max);
}

export function sortAccountsRows<T>(
  rows: T[],
  sortKey: string | null,
  sortDir: "asc" | "desc",
  getCellValue: (row: T, columnKey: string) => unknown,
): T[] {
  if (!sortKey) return rows;
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = getCellValue(a, sortKey);
    const bv = getCellValue(b, sortKey);
    const an = parseNum(av);
    const bn = parseNum(bv);
    if (an != null && bn != null) return (an - bn) * dir;
    return normStr(av).localeCompare(normStr(bv)) * dir;
  });
}
