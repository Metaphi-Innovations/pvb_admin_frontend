/**
 * Profit & Loss report service — mock provider today, API swap later.
 */

import {
  isMultiFilterActive,
  normalizeMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";
import type { PandLFilters } from "@/lib/accounts/pl-compute";
import type { PandLTraditionalSource } from "@/lib/accounts/pl-traditional";
import {
  getPlTraditionalMockSource,
  PL_MOCK_PERIOD_FROM,
  PL_MOCK_PERIOD_TO,
} from "./pl-traditional-mock";

function periodsOverlap(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): boolean {
  return aFrom <= bTo && aTo >= bFrom;
}

function branchFilterAllowsAll(branches: string | string[]): boolean {
  return normalizeMultiFilter(branches).length === 0;
}

function mockFiltersAllowDemoData(filters: PandLFilters): boolean {
  if (
    !periodsOverlap(
      filters.dateFrom,
      filters.dateTo,
      PL_MOCK_PERIOD_FROM,
      PL_MOCK_PERIOD_TO,
    )
  ) {
    return false;
  }

  if (!branchFilterAllowsAll(filters.branch)) return false;
  if (isMultiFilterActive(filters.warehouse)) return false;
  if (isMultiFilterActive(filters.partyId)) return false;
  if (isMultiFilterActive(filters.ledgerGroupId)) return false;
  if (isMultiFilterActive(filters.ledgerId)) return false;

  return true;
}

export function fetchPandLTraditionalSource(
  filters: PandLFilters,
): PandLTraditionalSource | null {
  if (!mockFiltersAllowDemoData(filters)) return null;
  return getPlTraditionalMockSource();
}

/** Planned API entry point — mock provider today. */
export function getProfitAndLossReport(
  filters: PandLFilters,
): PandLTraditionalSource | null {
  return fetchPandLTraditionalSource(filters);
}

export function getPlDemoTraditionalSourceIfPeriodOverlaps(
  filters: Pick<PandLFilters, "dateFrom" | "dateTo">,
): PandLTraditionalSource | null {
  if (
    !periodsOverlap(
      filters.dateFrom,
      filters.dateTo,
      PL_MOCK_PERIOD_FROM,
      PL_MOCK_PERIOD_TO,
    )
  ) {
    return null;
  }
  return getPlTraditionalMockSource();
}

export { PL_MOCK_PERIOD_FROM, PL_MOCK_PERIOD_TO } from "./pl-traditional-mock";
