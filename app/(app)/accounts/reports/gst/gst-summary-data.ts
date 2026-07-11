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

export interface GstDashboardExportRow {
  section: string;
  documentCount: number;
  taxableValue: number;
  taxAmount: number;
  exceptions: number;
}

export function flattenGstDashboardForExport(
  sections: Gstr1SectionRow[],
): GstDashboardExportRow[] {
  return sections.map((row) => ({
    section: row.section,
    documentCount: row.documentCount,
    taxableValue: row.taxableValue,
    taxAmount: row.taxAmount,
    exceptions: row.exceptions,
  }));
}

export interface GstSummaryCardExportRow {
  label: string;
  value: string | number;
}

export function flattenGstSummaryCardsForExport(
  cards: GstSummaryCards,
): GstSummaryCardExportRow[] {
  return [
    { label: "Total Sales Invoices", value: cards.totalSalesInvoices },
    { label: "Total Taxable Value", value: cards.totalTaxableValue },
    { label: "Total CGST", value: cards.totalCgst },
    { label: "Total SGST", value: cards.totalSgst },
    { label: "Total IGST", value: cards.totalIgst },
    { label: "Total Cess", value: cards.totalCess },
    { label: "Total Credit Notes", value: cards.totalCreditNotes },
    { label: "Total Debit Notes", value: cards.totalDebitNotes },
    { label: "Total Nil Rated / Exempt Value", value: cards.totalNilRatedExemptValue },
    { label: "Total Exceptions", value: cards.totalExceptions },
  ];
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
