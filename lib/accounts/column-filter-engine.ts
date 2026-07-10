import type {
  AccountsColumnFilterState,
  AccountsColumnFilters,
  DateFilterPreset,
  TextFilterOperator,
} from "./column-filter-types";

function normStr(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function normLower(v: unknown): string {
  return normStr(v).toLowerCase();
}

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
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
  const op = filter.numberOperator ?? "equals";
  const n = parseNum(cell);

  if (op === "blank") return isBlank(cell);
  if (op === "notBlank") return !isBlank(cell);
  if (n == null) return false;

  const v1 = filter.numberValue ?? 0;
  const v2 = filter.numberValue2 ?? v1;

  switch (op) {
    case "equals":
      return n === v1;
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

export function isColumnFilterActive(filter: AccountsColumnFilterState | undefined): boolean {
  if (!filter) return false;
  if (filter.selectedValues && filter.selectedValues.length > 0) return true;
  if (filter.textValue?.trim()) return true;
  if (filter.numberOperator === "blank" || filter.numberOperator === "notBlank") return true;
  if (filter.numberValue != null || filter.numberValue2 != null) return true;
  if (filter.textOperator === "blank" || filter.textOperator === "notBlank") return true;
  if (filter.datePreset && filter.datePreset !== "custom") return true;
  if (filter.dateFrom || filter.dateTo) return true;
  return false;
}

export function countActiveColumnFilters(filters: AccountsColumnFilters): number {
  return Object.values(filters).filter((f) => isColumnFilterActive(f)).length;
}

export function applyAccountsColumnFilters<T>(
  rows: T[],
  filters: AccountsColumnFilters,
  getCellValue: (row: T, columnKey: string) => unknown,
): T[] {
  const active = Object.entries(filters).filter(([, f]) => isColumnFilterActive(f));
  if (active.length === 0) return rows;

  return rows.filter((row) => {
    for (const [key, filter] of active) {
      if (!filter) continue;
      const cell = getCellValue(row, key);
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
          ok = matchStatus(cell, filter);
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
  max = 150,
): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const v = normStr(getCellValue(row, columnKey));
    if (v && v !== "—") set.add(v);
    if (set.size >= max) break;
  }
  return [...set].sort((a, b) => a.localeCompare(b));
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
