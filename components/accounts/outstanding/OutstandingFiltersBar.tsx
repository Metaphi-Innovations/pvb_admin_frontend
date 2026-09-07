"use client";

import { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportStatusMultiFilter,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  DAY_BOOK_DATE_RANGE_PRESET_OPTIONS,
  defaultAsOnDate,
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { defaultDayBookFyDateRange } from "@/lib/accounts/day-book-data";
import { BWO_STATUS_FILTER_OPTIONS } from "@/lib/accounts/bill-wise-outstanding-display";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useFY, type FinancialYear } from "@/lib/fy-store";

export interface OutstandingFiltersState {
  financialYearId: string;
  preset: DateRangePresetId;
  startDate: string;
  endDate: string;
  /** Outstanding as-of; defaults to endDate / today. */
  asOfDate: string;
  branches: string[];
  statuses: string[];
  search: string;
}

/** Prefer the FY flagged `isCurrent` (active), then working FY, then local fallback. */
export function resolveCurrentFinancialYear(
  allFYs: FinancialYear[],
  selectedFY?: FinancialYear | null,
): FinancialYear | null {
  const current = allFYs.find((y) => y.isCurrent && y.id);
  if (current) return current;
  if (selectedFY?.id && selectedFY.isCurrent) return selectedFY;
  if (selectedFY?.id) return selectedFY;
  return null;
}

export function defaultOutstandingFiltersState(
  currentFy?: Pick<FinancialYear, "id" | "startDate" | "endDate"> | null,
): OutstandingFiltersState {
  if (currentFy?.id) {
    const today = new Date().toISOString().slice(0, 10);
    const start = String(currentFy.startDate).slice(0, 10);
    const fyEnd = String(currentFy.endDate).slice(0, 10);
    const end = today < fyEnd ? today : fyEnd;
    return {
      financialYearId: currentFy.id,
      preset: "custom",
      startDate: start,
      endDate: end,
      asOfDate: defaultAsOnDate(),
      branches: [],
      statuses: [],
      search: "",
    };
  }

  const { from, to, fyId } = defaultDayBookFyDateRange();
  return {
    financialYearId: fyId,
    preset: "custom",
    startDate: from,
    endDate: to,
    asOfDate: defaultAsOnDate(),
    branches: [],
    statuses: [],
    search: "",
  };
}

export function OutstandingFiltersBar({
  value,
  onChange,
  onResetPage,
  showSearch = true,
  docLabel = "Invoice",
  exportDisabled,
  onExportExcel,
  onExportPdf,
}: {
  value: OutstandingFiltersState;
  onChange: (next: OutstandingFiltersState) => void;
  onResetPage?: () => void;
  showSearch?: boolean;
  docLabel?: string;
  exportDisabled?: boolean;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}) {
  const { selectedFY, allFYs } = useFY();
  const currentFy = useMemo(
    () => resolveCurrentFinancialYear(allFYs, selectedFY),
    [allFYs, selectedFY],
  );
  const defaults = useMemo(
    () => defaultOutstandingFiltersState(currentFy),
    [currentFy],
  );

  const patch = useCallback(
    (partial: Partial<OutstandingFiltersState>) => {
      onChange({ ...value, ...partial });
      onResetPage?.();
    },
    [onChange, onResetPage, value],
  );

  const statusOptions = useMemo(
    () =>
      BWO_STATUS_FILTER_OPTIONS.filter((o) => o.value !== "ALL").map((o) => ({
        value: o.value,
        label: o.label,
      })),
    [],
  );

  const handleFinancialYearChange = (fyId: string) => {
    if (fyId === "all") {
      patch({ financialYearId: fyId });
      return;
    }

    const fromStore = allFYs.find((f) => f.id === fyId);
    if (fromStore) {
      const today = new Date().toISOString().slice(0, 10);
      const start = String(fromStore.startDate).slice(0, 10);
      const fyEnd = String(fromStore.endDate).slice(0, 10);
      const end = today < fyEnd ? today : fyEnd;
      patch({
        financialYearId: fyId,
        startDate: start,
        endDate: end,
        asOfDate: end,
        preset: "custom",
      });
      return;
    }

    const fromLocal = loadFinancialYears().find((f) => String(f.id) === fyId);
    if (fromLocal) {
      const today = new Date().toISOString().slice(0, 10);
      const end =
        today < fromLocal.endDate ? today : fromLocal.endDate;
      patch({
        financialYearId: fyId,
        startDate: fromLocal.startDate,
        endDate: end,
        asOfDate: end,
        preset: "custom",
      });
      return;
    }

    patch({ financialYearId: fyId });
  };

  const handlePresetChange = (next: DateRangePresetId) => {
    if (next !== "custom") {
      const { from, to } = resolveDateRangePreset(next);
      patch({
        preset: next,
        startDate: from,
        endDate: to,
        asOfDate: to || defaultAsOnDate(),
      });
      return;
    }
    patch({ preset: next });
  };

  const hasFilters =
    value.preset !== "custom" ||
    value.financialYearId !== defaults.financialYearId ||
    value.startDate !== defaults.startDate ||
    value.endDate !== defaults.endDate ||
    value.branches.length > 0 ||
    value.statuses.length > 0 ||
    value.search.trim().length > 0;

  const clearFilters = () => {
    onChange(defaultOutstandingFiltersState(currentFy));
    onResetPage?.();
  };

  return (
    <ReportFilterRow
      className="items-end"
      end={
        onExportExcel || onExportPdf ? (
          <AccountsExportMenu
            onExcel={onExportExcel ?? (() => undefined)}
            onPdf={onExportPdf ?? (() => undefined)}
            disabled={exportDisabled}
          />
        ) : null
      }
    >
      <ReportFinancialYearFilter
        value={value.financialYearId}
        onChange={handleFinancialYearChange}
      />
      <ReportDateRangeFilter
        preset={value.preset}
        dateFrom={value.startDate}
        dateTo={value.endDate}
        onPresetChange={handlePresetChange}
        onDateFromChange={(v) => patch({ startDate: v, preset: "custom" })}
        onDateToChange={(v) =>
          patch({
            endDate: v,
            asOfDate: v || value.asOfDate || defaultAsOnDate(),
            preset: "custom",
          })
        }
        presetOptions={DAY_BOOK_DATE_RANGE_PRESET_OPTIONS}
      />
      <ReportBranchMultiFilter
        values={value.branches}
        onChange={(branches) => patch({ branches })}
        options={[...REPORT_BRANCH_OPTIONS]}
      />
      <ReportStatusMultiFilter
        values={value.statuses}
        onChange={(statuses) => patch({ statuses })}
        options={statusOptions}
      />
      {showSearch ? (
        <ReportSearchFilter
          value={value.search}
          onChange={(search) => patch({ search })}
          placeholder={`${docLabel} No. / Reference`}
          className="min-w-[180px] flex-1 basis-[180px] max-w-xs"
        />
      ) : null}
      {hasFilters ? (
        <Button
          variant="outline"
          size="sm"
          className="h-9 text-sm font-medium"
          onClick={clearFilters}
        >
          Clear Filters
        </Button>
      ) : null}
    </ReportFilterRow>
  );
}
