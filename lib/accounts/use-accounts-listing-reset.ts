import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";

/** Reset date range filter to a preset and resolve from/to dates immediately. */
export function resetReportDateRange(
  setPreset: (preset: DateRangePresetId) => void,
  setDateFrom: (value: string) => void,
  setDateTo: (value: string) => void,
  defaultPreset: DateRangePresetId = "this_month",
): void {
  setPreset(defaultPreset);
  const { from, to } = resolveDateRangePreset(defaultPreset);
  setDateFrom(from);
  setDateTo(to);
}

export interface AccountsListingFilterSnapshot {
  search?: string;
  preset?: DateRangePresetId;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | undefined;
}

/** True when any listing filter differs from defaults (for conditional Reset visibility). */
export function accountsListingFiltersActive(
  current: AccountsListingFilterSnapshot,
  defaults: AccountsListingFilterSnapshot,
): boolean {
  return Object.keys(defaults).some((key) => {
    const cur = current[key] ?? "";
    const def = defaults[key] ?? "";
    return cur !== def;
  });
}
