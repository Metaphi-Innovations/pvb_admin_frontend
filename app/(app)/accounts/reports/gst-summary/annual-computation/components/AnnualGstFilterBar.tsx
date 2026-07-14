"use client";

import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportGstRegistrationFilter,
  ReportFilterSummary,
  REPORT_BRANCH_OPTIONS,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  normalizeMultiFilter,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  GST_REGISTRATION_OPTIONS,
  getGstReportBranchOptions,
  resolveGstRegistrationLabel,
} from "@/lib/accounts/gst-report-filters";
import { useMemo, type ReactNode } from "react";
import type { useGstReportFilters } from "../../useGstReportFilters";

type FilterState = ReturnType<typeof useGstReportFilters>;

/** Annual GST Summary — FY, Branch, GST Registration only (no date range / GST period). */
export function AnnualGstFilterBar({
  filterState,
  mounted,
  end,
}: {
  filterState: FilterState;
  mounted: boolean;
  end?: ReactNode;
}) {
  const {
    financialYearId,
    handleFinancialYearChange,
    branch,
    setBranch,
    gstRegistration,
    setGstRegistration,
    resetFilters,
  } = filterState;

  const branchOptions = mounted ? getGstReportBranchOptions() : [...REPORT_BRANCH_OPTIONS];

  const hasAnnualFilters =
    financialYearId !== "all" ||
    normalizeMultiFilter(branch).length > 0 ||
    gstRegistration !== "all";

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
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
  }, [branch, setBranch, gstRegistration, setGstRegistration]);

  return (
    <>
      <ReportFilterRow className="items-end gap-2" end={end}>
        <ReportFinancialYearFilter
          value={financialYearId}
          onChange={handleFinancialYearChange}
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
        {hasAnnualFilters && (
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
