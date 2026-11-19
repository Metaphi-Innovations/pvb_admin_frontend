import type { FilterState } from "@/components/listing/types";

export type FilterOption = { label: string; value: string };

export function isActiveColFilter(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return false;
  return true;
}

/** Unique dropdown options from the rows currently shown in the listing. */
export function optionsFromRecords<T extends Record<string, unknown>>(
  rows: T[],
  key: keyof T & string,
): FilterOption[] {
  const values = [
    ...new Set(
      rows
        .map((r) => String(r[key] ?? "").trim())
        .filter((v) => v && v !== "—" && v !== "-"),
    ),
  ].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base", numeric: true }),
  );
  return values.map((value) => ({ label: value, value }));
}

/**
 * Cascading filter options (Batch Movements style):
 * - Active column → keep server facet list (exclude-self) so the user can change it
 * - Other columns, when another filter is applied and the full filtered set is loaded
 *   → only values that appear in the listing (what the user sees)
 * - Otherwise → server filter_options
 */
export function resolveFilterOptions<T extends Record<string, unknown>>(
  columnKey: string,
  serverOptions: FilterOption[],
  records: T[],
  totalRecords: number,
  appliedFilters: FilterState,
): FilterOption[] {
  const activeKeys = Object.keys(appliedFilters).filter(
    (k) => k !== "search" && isActiveColFilter(appliedFilters[k]),
  );
  const selfFiltered = activeKeys.includes(columnKey);
  const otherFiltersActive = activeKeys.some((k) => k !== columnKey);
  const fullFilteredSetLoaded =
    records.length > 0 && records.length === totalRecords;

  if (!selfFiltered && otherFiltersActive && fullFilteredSetLoaded) {
    return optionsFromRecords(records, columnKey);
  }
  return serverOptions;
}

export function parseFilterOptionsPayload(
  raw: unknown,
): Record<string, FilterOption[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, FilterOption[]> = {};
  Object.entries(raw as Record<string, unknown>).forEach(([key, val]) => {
    if (!Array.isArray(val)) return;
    out[key] = val
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const rec = row as Record<string, unknown>;
        const value = String(rec.value ?? rec.label ?? "").trim();
        if (!value) return null;
        return {
          label: String(rec.label || value).trim() || value,
          value,
        };
      })
      .filter((x): x is FilterOption => Boolean(x));
  });
  return out;
}
