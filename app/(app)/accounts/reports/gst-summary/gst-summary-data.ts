import {
  computeGstDashboard,
  type GstDashboardFilters,
  type GstDashboardResult,
  type GstSummaryCards,
  type Gstr1SectionRow,
  type GstOutwardTransaction,
  type Gstr1SectionId,
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  resolveFinancialYearLabel,
  filterGstTransactionsBySection,
  buildGstr1SectionHref,
  buildGstDashboardFilterQuery,
  parseGstDashboardFiltersFromSearch,
  GSTR1_SECTION_LABELS,
} from "@/lib/accounts/gst-summary-compute";

export type {
  GstDashboardFilters,
  GstDashboardResult,
  GstSummaryCards,
  Gstr1SectionRow,
  GstOutwardTransaction,
  Gstr1SectionId,
};

export {
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  resolveFinancialYearLabel,
  filterGstTransactionsBySection,
  buildGstr1SectionHref,
  buildGstDashboardFilterQuery,
  parseGstDashboardFiltersFromSearch,
  GSTR1_SECTION_LABELS,
};

export function buildGstDashboard(filters: GstDashboardFilters): GstDashboardResult {
  return computeGstDashboard(filters);
}

import { normalizeMultiFilter } from "@/lib/accounts/report-multi-filter-utils";

export function resolveBranchFilterLabel(branch: string | string[]): string {
  const values = normalizeMultiFilter(branch);
  if (values.length === 0) return "All branches";
  if (values.length === 1) return values[0];
  return `${values.length} branches`;
}

export function resolveWarehouseFilterLabel(warehouse: string | string[]): string {
  const values = normalizeMultiFilter(warehouse);
  if (values.length === 0) return "All warehouses";
  if (values.length === 1) return values[0];
  return `${values.length} warehouses`;
}
