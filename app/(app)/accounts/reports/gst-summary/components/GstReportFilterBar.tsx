"use client";

import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportGstPeriodFilter,
  ReportGstRegistrationFilter,
  ReportFilterSummary,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
} from "@/lib/accounts/report-multi-filter-utils";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";
import {
  GST_REGISTRATION_OPTIONS,
  resolveGstPeriodLabel,
  resolveGstRegistrationLabel,
} from "@/lib/accounts/gst-report-filters";
import { getGstReportBranchOptions } from "@/lib/accounts/gst-report-filters";
import { normalizeMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import { useMemo } from "react";
import type { useGstReportFilters } from "../useGstReportFilters";

type FilterState = ReturnType<typeof useGstReportFilters>;

export function GstReportFilterBar({
  filterState,
  mounted,
}: {
  filterState: FilterState;
  mounted: boolean;
}) {
  const {
    preset,
    setPreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    financialYearId,
    handleFinancialYearChange,
    gstPeriod,
    handleGstPeriodChange,
    gstPeriodOptions,
    branch,
    setBranch,
    gstRegistration,
    setGstRegistration,
    hasFilters,
    resetFilters,
  } = filterState;

  const branchOptions = mounted ? getGstReportBranchOptions() : [...REPORT_BRANCH_OPTIONS];

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      gstPeriod !== "all"
        ? {
            key: "gst-period",
            label: "GST Period",
            value: resolveGstPeriodLabel(gstPeriod),
            onRemove: () => handleGstPeriodChange("all"),
          }
        : null,
      buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
      gstRegistration !== "all"
        ? {
            key: "gstin",
            label: "GST Registration",
            value: resolveGstRegistrationLabel(gstRegistration),
            onRemove: () => setGstRegistration("all"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    gstPeriod,
    handleGstPeriodChange,
    branch,
    setBranch,
    gstRegistration,
    setGstRegistration,
  ]);

  return (
    <>
      <ReportFilterRow className="items-end gap-2">
        <ReportFinancialYearFilter
          value={financialYearId}
          onChange={handleFinancialYearChange}
        />
        <ReportGstPeriodFilter
          value={gstPeriod}
          onChange={handleGstPeriodChange}
          options={gstPeriodOptions}
        />
        <ReportDateRangeFilter
          preset={preset}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onPresetChange={setPreset}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
        <ReportBranchMultiFilter
          values={branch}
          onChange={setBranch}
          options={branchOptions}
        />
        <ReportGstRegistrationFilter
          value={gstRegistration}
          onChange={setGstRegistration}
          options={GST_REGISTRATION_OPTIONS}
        />
        {hasFilters && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-sm px-2"
            onClick={resetFilters}
          >
            Reset
          </Button>
        )}
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );
}
