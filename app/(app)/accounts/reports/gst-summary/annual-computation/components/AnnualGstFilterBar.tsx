"use client";

import { Button } from "@/components/ui/button";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportBranchMultiFilter,
  ReportGstRegistrationFilter,
  ReportFilterSummary,
} from "@/components/accounts/ReportFilters";
import {
  buildBranchFilterSummary,
  normalizeMultiFilter,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { resolveGstRegistrationLabel } from "@/lib/accounts/gst-report-filters";
import { useMemo, type ReactNode } from "react";
import type { useGstSummaryApiFilters } from "../../useGstSummaryApiFilters";

type FilterState = ReturnType<typeof useGstSummaryApiFilters>;

/** Annual GST Compliance Summary — FY + GSTIN required; branch optional. No All GSTINs. */
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
    branchLabeledOptions,
    gstRegistrationOptions,
  } = filterState;

  const branchOptions =
    branchLabeledOptions && branchLabeledOptions.length > 0
      ? branchLabeledOptions.map((o) => o.value)
      : [];

  const gstOptions = gstRegistrationOptions ?? [];

  const hasAnnualFilters =
    !!financialYearId ||
    normalizeMultiFilter(branch).length > 0 ||
    gstRegistration !== "all";

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] => {
    return [
      buildBranchFilterSummary(normalizeMultiFilter(branch), () => setBranch([])),
      gstRegistration !== "all"
        ? {
            id: "gstin",
            label: "GST Registration",
            value:
              gstOptions.find((o) => o.value === gstRegistration)?.label ??
              resolveGstRegistrationLabel(gstRegistration),
            onRemove: () => setGstRegistration("all"),
          }
        : null,
    ].filter((item): item is ReportFilterSummaryItem => item != null);
  }, [branch, setBranch, gstRegistration, setGstRegistration, gstOptions]);

  const gstSelectOptions = useMemo(() => {
    const regs = gstOptions.filter((o) => o.value !== "all");
    return [{ value: "all", label: "Select GSTIN…" }, ...regs];
  }, [gstOptions]);

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
          labeledOptions={
            branchLabeledOptions && branchLabeledOptions.length > 0
              ? branchLabeledOptions
              : undefined
          }
        />
        <ReportGstRegistrationFilter
          value={gstRegistration}
          onChange={setGstRegistration}
          options={gstSelectOptions}
        />
        {hasAnnualFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={resetFilters}
          >
            Reset
          </Button>
        ) : null}
      </ReportFilterRow>
      <ReportFilterSummary items={filterSummaryItems} />
    </>
  );
}
