/**
 * Shared multi-select filter utilities for Accounts reports.
 * Empty selection = all values (consolidated). OR within one filter, AND across filters.
 */

export type ReportMultiFilterValue = string[];

/** Normalize legacy single-select ("all") or array to multi-select values. */
export function normalizeMultiFilter(value: string | string[] | undefined | null): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === "all" || value === "") return [];
  return [value];
}

export function isMultiFilterActive(values: string | string[] | undefined | null): boolean {
  return normalizeMultiFilter(values).length > 0;
}

/** OR match: empty selection matches everything. */
export function matchesMultiFilter(
  selected: string | string[] | undefined | null,
  recordValue: string | null | undefined,
): boolean {
  const values = normalizeMultiFilter(selected);
  if (values.length === 0) return true;
  const normalized = (recordValue ?? "").trim();
  if (!normalized) return false;
  return values.includes(normalized);
}

/** OR match against any of the record values. */
export function matchesMultiFilterAny(
  selected: string | string[] | undefined | null,
  recordValues: Array<string | null | undefined>,
): boolean {
  const values = normalizeMultiFilter(selected);
  if (values.length === 0) return true;
  return recordValues.some((v) => {
    const normalized = (v ?? "").trim();
    return normalized && values.includes(normalized);
  });
}

/** OR match for numeric/string id fields stored as strings. */
export function matchesMultiIdFilter(
  selected: string | string[] | undefined | null,
  recordId: string | number | null | undefined,
): boolean {
  const values = normalizeMultiFilter(selected);
  if (values.length === 0) return true;
  if (recordId == null || recordId === "") return false;
  return values.includes(String(recordId));
}

export interface ReportMultiSelectOption {
  value: string;
  label: string;
  group?: string;
  searchText?: string;
}

export function formatMultiSelectLabel(
  values: string[],
  options: ReportMultiSelectOption[],
  entityName: string,
  allLabel?: string,
): string {
  if (values.length === 0) return allLabel ?? `All ${entityName}s`;
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  if (values.length === 1) {
    return labelByValue.get(values[0]) ?? values[0];
  }
  if (values.length === 2) {
    const a = labelByValue.get(values[0]) ?? values[0];
    const b = labelByValue.get(values[1]) ?? values[1];
    return `${a}, ${b}`;
  }
  return `${values.length} ${entityName}${values.length === 1 ? "" : "s"} Selected`;
}

export function formatMultiSelectShortLabel(
  values: string[],
  options: ReportMultiSelectOption[],
  firstLabel: string,
  entityName: string,
): string {
  if (values.length === 0) return firstLabel;
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  if (values.length === 1) return labelByValue.get(values[0]) ?? values[0];
  const first = labelByValue.get(values[0]) ?? values[0];
  if (values.length === 2) {
    const second = labelByValue.get(values[1]) ?? values[1];
    return `${first}, ${second}`;
  }
  return `${first} +${values.length - 1}`;
}

export interface ReportFilterSummaryItem {
  id: string;
  label: string;
  value: string;
  onRemove?: () => void;
}

export function buildBranchFilterSummary(
  branches: string[],
  onRemove?: () => void,
): ReportFilterSummaryItem | null {
  if (branches.length === 0) return null;
  return {
    id: "branch",
    label: "Branches",
    value: branches.length === 1 ? branches[0] : `${branches.length} selected`,
    onRemove,
  };
}

export function buildEntityFilterSummary(
  id: string,
  label: string,
  values: string[],
  options: ReportMultiSelectOption[],
  onRemove?: () => void,
): ReportFilterSummaryItem | null {
  if (values.length === 0) return null;
  return {
    id,
    label,
    value: formatMultiSelectLabel(values, options, label.replace(/s$/, "")),
    onRemove,
  };
}

export function countActiveMoreFilters(filters: Record<string, string | string[] | boolean | undefined>): number {
  let count = 0;
  for (const value of Object.values(filters)) {
    if (typeof value === "boolean") {
      if (value) count += 1;
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length > 0) count += 1;
      continue;
    }
    if (value && value !== "all" && value !== "") count += 1;
  }
  return count;
}

/** OR match for ledger id filters. */
export function matchesLedgerIdFilter(
  selected: string | string[] | undefined | null,
  ledgerId: number,
): boolean {
  return matchesMultiIdFilter(selected, ledgerId);
}

/** Parse comma-separated or single URL param into multi-select values. */
export function parseMultiFilterParam(value: string | null): string[] {
  if (!value || value === "all") return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Serialize multi-select values for URL params; null when empty (= all). */
export function serializeMultiFilterParam(
  value: string | string[] | undefined | null,
): string | null {
  const normalized = normalizeMultiFilter(value);
  if (normalized.length === 0) return null;
  return normalized.join(",");
}

export function appendMultiFilterParam(
  params: URLSearchParams,
  key: string,
  value: string | string[] | undefined | null,
): void {
  const serialized = serializeMultiFilterParam(value);
  if (serialized) params.set(key, serialized);
}

/** OR match for voucher type codes or labels. */
export function matchesVoucherTypeFilter(
  selected: string | string[] | undefined | null,
  recordValue: string | null | undefined,
): boolean {
  return matchesMultiFilter(selected, recordValue);
}

/** OR match for id fields stored with optional prefix (e.g. customer:123). */
export function matchesPrefixedIdFilter(
  selected: string | string[] | undefined | null,
  recordId: number | null | undefined,
  prefix: string,
): boolean {
  const values = normalizeMultiFilter(selected);
  if (values.length === 0) return true;
  if (recordId == null) return false;
  return values.some((v) => {
    const raw = String(v).startsWith(prefix) ? String(v).slice(prefix.length) : String(v);
    const id = Number(raw);
    return !Number.isNaN(id) && id === recordId;
  });
}

/** OR match for COA group id filters (account group or standard group). */
export function matchesLedgerGroupIdFilter(
  selected: string | string[] | undefined | null,
  groupIds: Array<number | null | undefined>,
): boolean {
  const values = normalizeMultiFilter(selected);
  if (values.length === 0) return true;
  const normalized = groupIds.filter((g): g is number => g != null);
  return values.some((v) => {
    const id = Number(v);
    return !Number.isNaN(id) && normalized.includes(id);
  });
}
