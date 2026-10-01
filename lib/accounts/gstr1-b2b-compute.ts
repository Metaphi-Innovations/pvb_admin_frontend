/**
 * GSTR-1 B2B Invoices report — registered-customer sales invoices.
 */

import {
  calcGstLineSplit,
  calcLineAmounts,
  getInvoiceAmountBreakup,
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  detectSalesInvoiceExceptions,
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  isB2bEligibleInvoice,
  resolveCustomerGstin,
  resolveCustomerState,
  type GstDashboardFilters,
  type GstExceptionCode,
  type GstExceptionIssue,
} from "@/lib/accounts/gst-summary-compute";
import { getInvoiceGstBreakup } from "@/lib/accounts/invoice-gst-breakup";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  matchesPrefixedIdFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";

export type B2bStatusFilter = "all" | "valid" | "exception";
export type B2bGstRateFilter = "all" | "5" | "12" | "18" | "28";

export interface B2bInvoiceFilters extends GstDashboardFilters {
  customerId: string | string[];
  gstRate: B2bGstRateFilter;
  invoiceNo: string;
  status: B2bStatusFilter;
}

export interface B2bRateBreakup {
  ratePct: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
}

export interface B2bLineDetail {
  id: string;
  productName: string;
  productId: number | null;
  hsn: string;
  qty: number;
  unit: string;
  taxableValue: number;
  taxPct: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  lineTotal: number;
}

export type B2bInvoiceStatus = "valid" | "exception";

export interface B2bInvoiceRow {
  invoiceId: number;
  invoiceDate: string;
  invoiceNo: string;
  customerId: number | null;
  customerName: string;
  gstin: string;
  placeOfSupply: string;
  customerState: string;
  invoiceValue: number;
  taxableValue: number;
  gstRateLabel: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  status: B2bInvoiceStatus;
  exceptions: GstExceptionIssue[];
  rateBreakups: B2bRateBreakup[];
  lineDetails: B2bLineDetail[];
  branch: string;
  warehouse: string;
  voucherNo: string;
  voucherId: number | null;
  interstate: boolean;
  hasMultipleRates: boolean;
}

export interface B2bSummaryTotals {
  totalInvoices: number;
  totalInvoiceValue: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalExceptions: number;
}

export interface B2bInvoiceReport {
  rows: B2bInvoiceRow[];
  totals: B2bSummaryTotals;
  hasData: boolean;
}

function round2(n: number): number {
  return roundMoney(n);
}

function buildDuplicateInvoiceNumbers(): Set<string> {
  const counts = new Map<string, number>();
  for (const inv of loadInvoices()) {
    const key = inv.invoiceNo?.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [k, c] of counts) if (c > 1) dupes.add(k);
  return dupes;
}

function matchesBaseFilters(inv: InvoiceRecord, filters: B2bInvoiceFilters): boolean {
  const date = inv.invoiceDate.slice(0, 10);
  if (filters.financialYearId !== "all" && filters.financialYearId) {
    const fy = loadFinancialYears().find((f) => String(f.id) === filters.financialYearId);
    if (fy && (date < fy.startDate || date > fy.endDate)) return false;
  }
  if (date < filters.dateFrom || date > filters.dateTo) return false;
  const branch = inv.branch?.trim() || "";
  const warehouse = inv.warehouse?.trim() || "";
  if (!matchesMultiFilter(filters.branch, branch)) return false;
  if (!matchesMultiFilter(filters.warehouse, warehouse)) return false;
  return true;
}

function buildRateBreakups(inv: InvoiceRecord, interstate: boolean): B2bRateBreakup[] {
  const buckets = new Map<
    number,
    { taxable: number; cgst: number; sgst: number; igst: number }
  >();

  for (const line of inv.lineItems) {
    if (line.qty <= 0) continue;
    const rate = line.taxPct ?? 0;
    const { taxable } = calcLineAmounts(line);
    const split = calcGstLineSplit(line, interstate);
    const existing = buckets.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    buckets.set(rate, {
      taxable: round2(existing.taxable + taxable),
      cgst: round2(existing.cgst + split.cgst),
      sgst: round2(existing.sgst + split.sgst),
      igst: round2(existing.igst + split.igst),
    });
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([ratePct, b]) => ({
      ratePct,
      taxableValue: b.taxable,
      cgst: b.cgst,
      sgst: b.sgst,
      igst: b.igst,
      cess: 0,
      totalTax: round2(b.cgst + b.sgst + b.igst),
    }));
}

function buildLineDetails(inv: InvoiceRecord, interstate: boolean): B2bLineDetail[] {
  return inv.lineItems
    .filter((l) => l.qty > 0)
    .map((line) => {
      const { taxable } = calcLineAmounts(line);
      const split = calcGstLineSplit(line, interstate);
      return {
        id: line.id,
        productName: line.productName || line.description || "—",
        productId: line.productId,
        hsn: line.hsn?.trim() || "—",
        qty: line.qty,
        unit: line.unit || "—",
        taxableValue: taxable,
        taxPct: line.taxPct ?? 0,
        cgst: split.cgst,
        sgst: split.sgst,
        igst: split.igst,
        cess: 0,
        lineTotal: split.lineTotal,
      };
    });
}

function formatGstRateLabel(breakups: B2bRateBreakup[]): string {
  const taxed = breakups.filter((b) => b.ratePct > 0);
  if (taxed.length === 0) return "0%";
  if (taxed.length === 1) return `${taxed[0].ratePct}%`;
  return "Multi";
}

function invoiceToB2bRow(inv: InvoiceRecord, duplicateNos: Set<string>): B2bInvoiceRow {
  const breakup = getInvoiceGstBreakup(inv);
  const interstate = breakup.interstate;
  const rateBreakups = buildRateBreakups(inv, interstate);
  const exceptions = detectSalesInvoiceExceptions(inv, duplicateNos);
  const { taxableValue } = getInvoiceAmountBreakup(inv);

  return {
    invoiceId: inv.id,
    invoiceDate: inv.invoiceDate.slice(0, 10),
    invoiceNo: inv.invoiceNo,
    customerId: inv.customerId,
    customerName: inv.customerName || "—",
    gstin: resolveCustomerGstin(inv.customerId, inv.customerGst) || "—",
    placeOfSupply: inv.placeOfSupply?.trim() || "—",
    customerState: resolveCustomerState(inv.customerId, inv.state) || "—",
    invoiceValue: inv.grandTotal,
    taxableValue,
    gstRateLabel: formatGstRateLabel(rateBreakups),
    cgst: breakup.cgst,
    sgst: breakup.sgst,
    igst: breakup.igst,
    cess: 0,
    totalTax: round2(breakup.cgst + breakup.sgst + breakup.igst),
    status: exceptions.length > 0 ? "exception" : "valid",
    exceptions,
    rateBreakups,
    lineDetails: buildLineDetails(inv, interstate),
    branch: inv.branch?.trim() || "—",
    warehouse: inv.warehouse?.trim() || "—",
    voucherNo: inv.postedVoucherNo?.trim() || "—",
    voucherId: inv.postedVoucherId ?? null,
    interstate,
    hasMultipleRates: rateBreakups.filter((b) => b.ratePct > 0).length > 1,
  };
}

function matchesB2bFilters(row: B2bInvoiceRow, filters: B2bInvoiceFilters): boolean {
  if (!matchesPrefixedIdFilter(filters.customerId, row.customerId, "customer:")) return false;
  if (filters.gstRate !== "all") {
    const rate = Number(filters.gstRate);
    const hasRate = row.rateBreakups.some((b) => Math.round(b.ratePct) === rate);
    if (!hasRate) return false;
  }
  const q = filters.invoiceNo.trim().toLowerCase();
  if (q && !row.invoiceNo.toLowerCase().includes(q)) return false;
  if (filters.status === "valid" && row.status !== "valid") return false;
  if (filters.status === "exception" && row.status !== "exception") return false;
  return true;
}

function buildTotals(rows: B2bInvoiceRow[]): B2bSummaryTotals {
  return {
    totalInvoices: rows.length,
    totalInvoiceValue: round2(rows.reduce((s, r) => s + r.invoiceValue, 0)),
    totalTaxableValue: round2(rows.reduce((s, r) => s + r.taxableValue, 0)),
    totalCgst: round2(rows.reduce((s, r) => s + r.cgst, 0)),
    totalSgst: round2(rows.reduce((s, r) => s + r.sgst, 0)),
    totalIgst: round2(rows.reduce((s, r) => s + r.igst, 0)),
    totalCess: round2(rows.reduce((s, r) => s + r.cess, 0)),
    totalExceptions: rows.filter((r) => r.status === "exception").length,
  };
}

export function buildB2bInvoiceReport(filters: B2bInvoiceFilters): B2bInvoiceReport {
  const duplicateNos = buildDuplicateInvoiceNumbers();
  const rows: B2bInvoiceRow[] = [];

  for (const inv of loadInvoices()) {
    if (!isB2bEligibleInvoice(inv)) continue;
    if (!matchesBaseFilters(inv, filters)) continue;
    const row = invoiceToB2bRow(inv, duplicateNos);
    if (!matchesB2bFilters(row, filters)) continue;
    rows.push(row);
  }

  rows.sort(
    (a, b) =>
      b.invoiceDate.localeCompare(a.invoiceDate) || b.invoiceNo.localeCompare(a.invoiceNo),
  );

  return {
    rows,
    totals: buildTotals(rows),
    hasData: rows.length > 0,
  };
}

export function getB2bCustomerOptions(): { id: string; name: string }[] {
  const map = new Map<number, string>();
  for (const inv of loadInvoices()) {
    if (!isB2bEligibleInvoice(inv)) continue;
    if (inv.customerId != null && inv.customerName) {
      map.set(inv.customerId, inv.customerName);
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id: `customer:${id}`, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getB2bInvoiceById(invoiceId: number): B2bInvoiceRow | undefined {
  const inv = loadInvoices().find((i) => i.id === invoiceId);
  if (!inv || !isB2bEligibleInvoice(inv)) return undefined;
  return invoiceToB2bRow(inv, buildDuplicateInvoiceNumbers());
}

export interface ExceptionFixAction {
  label: string;
  href: string;
}

export function resolveExceptionFixAction(
  code: GstExceptionCode,
  inv: Pick<InvoiceRecord, "id" | "customerId" | "lineItems">,
): ExceptionFixAction | null {
  switch (code) {
    case "missing_gstin_registered":
    case "invalid_gstin":
    case "missing_customer_state":
      if (inv.customerId != null) {
        return { label: "Fix Customer", href: `/masters/customers/${inv.customerId}/edit` };
      }
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${inv.id}/edit` };
    case "missing_hsn":
    case "missing_gst_rate": {
      const line = inv.lineItems.find((l) => l.qty > 0);
      if (line?.productId) {
        return { label: "Fix Product", href: `/masters/products/${line.productId}/edit` };
      }
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${inv.id}/edit` };
    }
    default:
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${inv.id}/edit` };
  }
}

export function parseB2bFiltersFromSearch(
  search: string,
  defaults: B2bInvoiceFilters,
): B2bInvoiceFilters {
  const params = new URLSearchParams(search);
  const gstRate = params.get("gstRate") as B2bGstRateFilter | null;
  const status = params.get("status") as B2bStatusFilter | null;
  const validRates: B2bGstRateFilter[] = ["all", "5", "12", "18", "28"];
  const validStatus: B2bStatusFilter[] = ["all", "valid", "exception"];

  const branchParam = params.get("branch");
  const warehouseParam = params.get("warehouse");
  const customerParam = params.get("customer");

  return {
    financialYearId: params.get("fy") ?? defaults.financialYearId,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    branch: branchParam != null ? parseMultiFilterParam(branchParam) : defaults.branch,
    warehouse: warehouseParam != null ? parseMultiFilterParam(warehouseParam) : defaults.warehouse,
    customerId: customerParam != null ? parseMultiFilterParam(customerParam) : defaults.customerId,
    gstRate: gstRate && validRates.includes(gstRate) ? gstRate : defaults.gstRate,
    invoiceNo: params.get("invoiceNo") ?? defaults.invoiceNo,
    status: status && validStatus.includes(status) ? status : defaults.status,
  };
}

export function buildB2bFilterQuery(filters: B2bInvoiceFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  appendMultiFilterParam(params, "customer", filters.customerId);
  if (filters.gstRate !== "all") params.set("gstRate", filters.gstRate);
  if (filters.invoiceNo.trim()) params.set("invoiceNo", filters.invoiceNo.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  return params.toString();
}

export {
  getGstDashboardBranchOptions as getB2bBranchOptions,
  getGstDashboardWarehouseOptions as getB2bWarehouseOptions,
};
