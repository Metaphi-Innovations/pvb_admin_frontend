"use client";

import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportGstPeriodFilter,
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
  resolveGstPeriodLabel,
  resolveGstRegistrationLabel,
} from "@/lib/accounts/gst-report-filters";
import { useMemo, type ReactNode } from "react";
import type { useGstReportFilters } from "../../useGstReportFilters";
import type { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";

type FilterState =
  | ReturnType<typeof useGstReportFilters>
  | ReturnType<typeof useGstSummaryApiFilters>;

/** GSTR-2B only — FY, Return Period, Branch/GSTIN (no date-range filter). */
export function Gstr2bFilterBar({
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

  const apiBranchOptions =
    "branchLabeledOptions" in filterState
      ? filterState.branchLabeledOptions
      : undefined;
  const apiGstRegistrationOptions =
    "gstRegistrationOptions" in filterState
      ? filterState.gstRegistrationOptions
      : undefined;

  // Prefer live GST Summary filter options; never silently use demo masters
  // when the API filter hook is active.
  const usesApiFilters = "branchLabeledOptions" in filterState;
  const branchOptions = usesApiFilters
    ? (apiBranchOptions ?? []).map((o) => o.value)
    : mounted
      ? getGstReportBranchOptions()
      : [...REPORT_BRANCH_OPTIONS];
  const gstRegistrationOptions = usesApiFilters
    ? (apiGstRegistrationOptions ?? [])
    : GST_REGISTRATION_OPTIONS;

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    const branchSummary = apiBranchOptions?.length
      ? (() => {
          const values = normalizeMultiFilter(branch);
          if (values.length === 0) return null;
          const labels = values.map(
            (id) =>
              apiBranchOptions.find((o) => o.value === id)?.label ?? id,
          );
          return {
            id: "branch",
            label: "Branch",
            value:
              labels.length === 1 ? labels[0] : `${labels.length} branches`,
            onRemove: () => setBranch([]),
          } satisfies ReportFilterSummaryItem;
        })()
      : buildBranchFilterSummary(normalizeMultiFilter(branch), () =>
          setBranch([]),
        );

    return [
      gstPeriod !== "all"
        ? {
            id: "gst-period",
            label: "Return Period",
            value:
              gstPeriodOptions.find((o) => o.value === gstPeriod)?.label ??
              resolveGstPeriodLabel(gstPeriod),
            onRemove: () => handleGstPeriodChange("all"),
          }
        : null,
      branchSummary,
      gstRegistration !== "all"
        ? {
            id: "gstin",
            label: "GST Registration",
            value:
              gstRegistrationOptions.find((o) => o.value === gstRegistration)
                ?.label ?? resolveGstRegistrationLabel(gstRegistration),
            onRemove: () => setGstRegistration("all"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [
    gstPeriod,
    gstPeriodOptions,
    handleGstPeriodChange,
    branch,
    setBranch,
    gstRegistration,
    setGstRegistration,
    apiBranchOptions,
    gstRegistrationOptions,
  ]);

  return (
    <>
      <ReportFilterRow className="items-end gap-2" end={end}>
        <ReportFinancialYearFilter
          value={financialYearId}
          onChange={handleFinancialYearChange}
        />
        <ReportGstPeriodFilter
          value={gstPeriod}
          onChange={handleGstPeriodChange}
          options={gstPeriodOptions}
        />
        <ReportBranchMultiFilter
          values={branch}
          onChange={setBranch}
          options={branchOptions}
          labeledOptions={
            apiBranchOptions && apiBranchOptions.length > 0
              ? apiBranchOptions
              : undefined
          }
        />
        <ReportGstRegistrationFilter
          value={gstRegistration}
          onChange={setGstRegistration}
          options={gstRegistrationOptions}
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
