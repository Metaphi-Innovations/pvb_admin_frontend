/**
 * GSTR-1 HSN-wise Summary — invoice-line HSN aggregation with credit note returns.
 */

import {
  loadCreditNotes,
  type CreditNoteLine,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  calcGstLineSplit,
  calcLineAmounts,
  loadInvoices,
  type InvoiceLineItem,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadHSNMasters } from "@/app/(app)/masters/hsn/hsn-data";
import { loadProducts, type Product } from "@/app/(app)/masters/products/product-data";
import { loadUOMMasters } from "@/app/(app)/masters/uom/uom-data";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import { isInterstateGst } from "@/lib/accounts/invoice-gst-breakup";
import {
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  isQualifyingCreditNote,
  isQualifyingSalesInvoice,
  type GstDashboardFilters,
  type GstExceptionCode,
  type GstExceptionIssue,
} from "@/lib/accounts/gst-summary-compute";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";

export type HsnStatusFilter = "all" | "valid" | "exception";
export type HsnGstRateFilter = "all" | "0" | "5" | "12" | "18" | "28";

export interface HsnSummaryFilters extends GstDashboardFilters {
  hsnCode: string;
  gstRate: HsnGstRateFilter;
  status: HsnStatusFilter;
}

export type HsnRowStatus = "valid" | "exception";

export interface HsnSourceDetail {
  detailKey: string;
  docType: "sales_invoice" | "credit_note";
  invoiceId: number | null;
  creditNoteId: number | null;
  invoiceDate: string;
  documentNo: string;
  customerName: string;
  productName: string;
  productId: number | null;
  qty: number;
  unit: string;
  taxableValue: number;
  grossValue: number;
  returnValue: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  creditNoteRef: string;
  netValue: number;
}

export interface HsnSummaryRow {
  rowKey: string;
  hsnCode: string;
  hsnId: number | null;
  description: string;
  uqc: string;
  totalQuantity: number;
  grossValue: number;
  salesReturnValue: number;
  netTaxableValue: number;
  gstRate: number;
  gstRateLabel: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
  status: HsnRowStatus;
  exceptions: GstExceptionIssue[];
  sourceLines: HsnSourceDetail[];
}

export interface HsnSummaryTotals {
  totalHsnCodes: number;
  totalQuantity: number;
  totalGrossValue: number;
  totalSalesReturnValue: number;
  totalNetTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalExceptions: number;
}

export interface HsnSummaryReport {
  rows: HsnSummaryRow[];
  totals: HsnSummaryTotals;
  hasData: boolean;
}

interface LineEvent {
  docType: "sales_invoice" | "credit_note";
  docId: number;
  docNo: string;
  docDate: string;
  lineId: string;
  customerName: string;
  productId: number | null;
  productName: string;
  hsn: string;
  hsnId: number | null;
  unit: string;
  qty: number;
  ratePct: number;
  grossTaxable: number;
  returnTaxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  branch: string;
  warehouse: string;
  creditNoteRef: string;
  sourceInvoiceNo: string;
  exceptions: GstExceptionIssue[];
}

function round2(n: number): number {
  return roundMoney(n);
}

function normalizeHsn(code: string): string {
  return code.replace(/\D/g, "").trim();
}

function isValidHsnFormat(code: string): boolean {
  const digits = normalizeHsn(code);
  return digits.length >= 4 && digits.length <= 8;
}

function resolveProduct(line: { productId?: number | null; productName?: string }): Product | undefined {
  if (line.productId != null) {
    return loadProducts().find((p) => p.id === line.productId);
  }
  const name = line.productName?.trim().toLowerCase();
  if (!name) return undefined;
  return loadProducts().find((p) => p.productName.trim().toLowerCase() === name);
}

function resolveHsnMaster(code: string) {
  const norm = normalizeHsn(code);
  if (!norm) return undefined;
  return loadHSNMasters().find(
    (h) =>
      h.status === "active" &&
      (h.hsnCode === norm || h.hsnCode.startsWith(norm) || norm.startsWith(h.hsnCode)),
  );
}

function resolveUqc(unit: string): string {
  const trimmed = unit?.trim() || "";
  if (!trimmed) return "—";
  const uoms = loadUOMMasters();
  const match = uoms.find(
    (u) =>
      u.status === "active" &&
      (u.shortName.toLowerCase() === trimmed.toLowerCase() ||
        u.unitName.toLowerCase() === trimmed.toLowerCase()),
  );
  return match?.shortName ?? trimmed.toUpperCase();
}

function isKnownUqc(unit: string): boolean {
  const trimmed = unit?.trim();
  if (!trimmed) return false;
  return loadUOMMasters().some(
    (u) =>
      u.status === "active" &&
      (u.shortName.toLowerCase() === trimmed.toLowerCase() ||
        u.unitName.toLowerCase() === trimmed.toLowerCase()),
  );
}

function parseProductRatePct(product: Product | undefined): number | null {
  if (!product?.gstRate?.trim()) return null;
  const n = parseFloat(product.gstRate.replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function creditLineAmounts(line: CreditNoteLine, interstate: boolean) {
  const amount = line.creditAmount ?? 0;
  if (amount <= 0) {
    return { taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
  }
  const rate = 1 + (line.taxPct ?? 0) / 100;
  const taxable = round2(amount / rate);
  const tax = round2(amount - taxable);
  if (interstate) {
    return { taxable, cgst: 0, sgst: 0, igst: tax, tax };
  }
  const half = round2(tax / 2);
  return { taxable, cgst: half, sgst: round2(tax - half), igst: 0, tax };
}

function detectLineExceptions(
  hsn: string,
  productName: string,
  unit: string,
  ratePct: number,
  product: Product | undefined,
  computedTaxable: number,
  lineTaxable: number,
  computedTax: number,
  lineTaxAmt: number,
): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];
  const hsnNorm = normalizeHsn(hsn);

  if (!hsnNorm) {
    issues.push({ code: "missing_hsn", message: "Missing HSN / SAC code" });
  } else if (!isValidHsnFormat(hsn)) {
    issues.push({ code: "invalid_hsn_format", message: "Invalid HSN / SAC format" });
  }

  const hsnMaster = hsnNorm ? resolveHsnMaster(hsnNorm) : undefined;
  if (!hsnMaster?.hsnDescription?.trim() && !productName?.trim()) {
    issues.push({ code: "missing_description", message: "Missing HSN / product description" });
  }

  if (!unit?.trim() || unit === "—") {
    issues.push({ code: "missing_uqc_unit", message: "Missing UQC / Unit" });
  } else if (!isKnownUqc(unit)) {
    issues.push({ code: "missing_uqc_unit", message: "Unit not found in UOM Master" });
  }

  if (ratePct == null || Number.isNaN(ratePct)) {
    issues.push({ code: "missing_gst_rate", message: "Missing GST rate" });
  }

  const productRate = parseProductRatePct(product);
  if (productRate != null && Math.round(productRate) !== Math.round(ratePct)) {
    issues.push({
      code: "product_gst_rate_mismatch",
      message: "Product GST rate does not match invoice line rate",
    });
  }

  if (Math.abs(computedTaxable - lineTaxable) > 0.05) {
    issues.push({
      code: "taxable_value_mismatch",
      message: "Taxable value does not match line calculation",
    });
  }

  if (Math.abs(computedTax - lineTaxAmt) > 0.05) {
    issues.push({
      code: "tax_amount_mismatch",
      message: "Tax calculation mismatch on line",
    });
  }

  return issues;
}

function matchesDocFilters(
  docDate: string,
  branch: string,
  warehouse: string,
  filters: HsnSummaryFilters,
): boolean {
  const date = docDate.slice(0, 10);
  if (filters.financialYearId !== "all" && filters.financialYearId) {
    const fy = loadFinancialYears().find((f) => String(f.id) === filters.financialYearId);
    if (fy && (date < fy.startDate || date > fy.endDate)) return false;
  }
  if (date < filters.dateFrom || date > filters.dateTo) return false;
  if (!matchesMultiFilter(filters.branch, branch === "—" ? "" : branch)) return false;
  if (!matchesMultiFilter(filters.warehouse, warehouse === "—" ? "" : warehouse)) return false;
  return true;
}

function invoiceLineToEvent(inv: InvoiceRecord, line: InvoiceLineItem): LineEvent | null {
  if (line.qty <= 0) return null;

  const product = resolveProduct(line);
  const hsn = line.hsn?.trim() || product?.hsnCode?.trim() || "";
  const hsnMaster = hsn ? resolveHsnMaster(hsn) : undefined;
  const interstate = isInterstateGst(inv.gstTreatment, inv.placeOfSupply, inv.state);
  const split = calcGstLineSplit(line, interstate);
  const { taxable, taxAmt } = calcLineAmounts(line);
  const exceptions = detectLineExceptions(
    hsn,
    line.productName || line.description,
    line.unit,
    line.taxPct ?? 0,
    product,
    split.taxable,
    taxable,
    split.cgst + split.sgst + split.igst,
    taxAmt,
  );

  return {
    docType: "sales_invoice",
    docId: inv.id,
    docNo: inv.invoiceNo,
    docDate: inv.invoiceDate.slice(0, 10),
    lineId: line.id,
    customerName: inv.customerName || "—",
    productId: line.productId ?? product?.id ?? null,
    productName: line.productName || line.description || "—",
    hsn,
    hsnId: (hsnMaster?.id ?? product?.hsnId) != null ? Number(hsnMaster?.id ?? product?.hsnId) : null,
    unit: line.unit || "—",
    qty: line.qty,
    ratePct: line.taxPct ?? 0,
    grossTaxable: taxable,
    returnTaxable: 0,
    cgst: split.cgst,
    sgst: split.sgst,
    igst: split.igst,
    cess: 0,
    branch: inv.branch?.trim() || "—",
    warehouse: inv.warehouse?.trim() || "—",
    creditNoteRef: "—",
    sourceInvoiceNo: inv.invoiceNo,
    exceptions,
  };
}

function creditNoteLineToEvent(cn: CreditNoteRecord, line: CreditNoteLine): LineEvent | null {
  const qty = line.returnQty ?? 0;
  const amount = line.creditAmount ?? 0;
  if (qty <= 0 && amount <= 0) return null;

  const product = resolveProduct(line);
  const hsn = line.hsn?.trim() || product?.hsnCode?.trim() || "";
  const hsnMaster = hsn ? resolveHsnMaster(hsn) : undefined;
  const placeOfSupply = (cn as { placeOfSupply?: string }).placeOfSupply;
  const interstate = inferInterstateFromPlaceOfSupply(placeOfSupply);
  const split = creditLineAmounts(line, interstate);
  const exceptions = detectLineExceptions(
    hsn,
    line.productName,
    "—",
    line.taxPct ?? 0,
    product,
    split.taxable,
    split.taxable,
    split.tax,
    split.tax,
  );

  const sourceInv = cn.sourceInvoiceNo?.trim() || "—";
  let branch = (cn as { branch?: string }).branch?.trim() || "—";
  let warehouse = "—";
  if (cn.sourceInvoiceId != null) {
    const inv = loadInvoices().find((i) => i.id === cn.sourceInvoiceId);
    branch = branch !== "—" ? branch : inv?.branch?.trim() || "—";
    warehouse = inv?.warehouse?.trim() || "—";
  }

  return {
    docType: "credit_note",
    docId: cn.id,
    docNo: cn.creditNoteNo,
    docDate: cn.creditNoteDate.slice(0, 10),
    lineId: line.id,
    customerName: cn.customerName || "—",
    productId: line.productId ?? product?.id ?? null,
    productName: line.productName || line.description || "—",
    hsn,
    hsnId: (hsnMaster?.id ?? product?.hsnId) != null ? Number(hsnMaster?.id ?? product?.hsnId) : null,
    unit: "—",
    qty,
    ratePct: line.taxPct ?? 0,
    grossTaxable: 0,
    returnTaxable: split.taxable,
    cgst: -split.cgst,
    sgst: -split.sgst,
    igst: -split.igst,
    cess: 0,
    branch,
    warehouse,
    creditNoteRef: cn.creditNoteNo,
    sourceInvoiceNo: sourceInv,
    exceptions,
  };
}

function groupKey(event: LineEvent): string {
  const hsn = normalizeHsn(event.hsn) || "UNKNOWN";
  const uqc = resolveUqc(event.unit);
  return `${hsn}|${event.ratePct}|${uqc}`;
}

function mergeExceptions(events: LineEvent[]): GstExceptionIssue[] {
  const seen = new Set<string>();
  const merged: GstExceptionIssue[] = [];
  for (const ev of events) {
    for (const ex of ev.exceptions) {
      const key = `${ex.code}|${ex.message}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(ex);
      }
    }
  }

  // Same product mapped to different rates within this HSN+UQC group
  const productRates = new Map<number, Set<number>>();
  for (const ev of events) {
    if (ev.productId == null) continue;
    const set = productRates.get(ev.productId) ?? new Set<number>();
    set.add(Math.round(ev.ratePct));
    productRates.set(ev.productId, set);
  }
  for (const [, rates] of productRates) {
    if (rates.size > 1) {
      merged.push({
        code: "product_gst_rate_mismatch",
        message: "Different GST rates mapped to the same product incorrectly",
      });
      break;
    }
  }

  return merged;
}

function eventToDetail(ev: LineEvent): HsnSourceDetail {
  const isReturn = ev.docType === "credit_note";
  const tax = round2(ev.cgst + ev.sgst + ev.igst + ev.cess);
  const taxable = isReturn ? ev.returnTaxable : ev.grossTaxable;
  return {
    detailKey: `${ev.docType}-${ev.docId}-${ev.lineId}`,
    docType: ev.docType,
    invoiceId: ev.docType === "sales_invoice" ? ev.docId : null,
    creditNoteId: ev.docType === "credit_note" ? ev.docId : null,
    invoiceDate: ev.docDate,
    documentNo: ev.docNo,
    customerName: ev.customerName,
    productName: ev.productName,
    productId: ev.productId,
    qty: isReturn ? -ev.qty : ev.qty,
    unit: resolveUqc(ev.unit),
    taxableValue: isReturn ? -taxable : taxable,
    grossValue: ev.grossTaxable,
    returnValue: ev.returnTaxable,
    gstRate: ev.ratePct,
    cgst: ev.cgst,
    sgst: ev.sgst,
    igst: ev.igst,
    cess: ev.cess,
    creditNoteRef: ev.creditNoteRef,
    netValue: round2((isReturn ? -taxable : taxable) + tax),
  };
}

function buildSummaryRow(rowKey: string, events: LineEvent[]): HsnSummaryRow {
  const sample = events[0];
  const hsnNorm = normalizeHsn(sample.hsn) || "—";
  const hsnMaster = hsnNorm !== "—" ? resolveHsnMaster(hsnNorm) : undefined;
  const product = sample.productId != null ? resolveProduct({ productId: sample.productId }) : undefined;
  const description =
    hsnMaster?.hsnDescription?.trim() ||
    product?.productName?.trim() ||
    sample.productName ||
    "—";
  const uqc = resolveUqc(sample.unit);

  const grossValue = round2(events.reduce((s, e) => s + e.grossTaxable, 0));
  const salesReturnValue = round2(events.reduce((s, e) => s + e.returnTaxable, 0));
  const netTaxableValue = round2(grossValue - salesReturnValue);
  const cgst = round2(events.reduce((s, e) => s + e.cgst, 0));
  const sgst = round2(events.reduce((s, e) => s + e.sgst, 0));
  const igst = round2(events.reduce((s, e) => s + e.igst, 0));
  const cess = round2(events.reduce((s, e) => s + e.cess, 0));
  const totalTax = round2(cgst + sgst + igst + cess);
  const salesQty = events.filter((e) => e.docType === "sales_invoice").reduce((s, e) => s + e.qty, 0);
  const returnQty = events.filter((e) => e.docType === "credit_note").reduce((s, e) => s + e.qty, 0);
  const totalQuantity = round2(salesQty - returnQty);

  const exceptions = mergeExceptions(events);
  const expectedTax = round2(netTaxableValue * (sample.ratePct / 100));
  if (sample.ratePct > 0 && Math.abs(expectedTax - Math.abs(totalTax)) > 0.1 && netTaxableValue > 0) {
    exceptions.push({
      code: "tax_amount_mismatch",
      message: "Tax total does not match net taxable value at applied rate",
    });
  }

  const sourceLines = events
    .map(eventToDetail)
    .sort(
      (a, b) =>
        b.invoiceDate.localeCompare(a.invoiceDate) || b.documentNo.localeCompare(a.documentNo),
    );

  return {
    rowKey,
    hsnCode: hsnNorm,
    hsnId: hsnMaster?.id ?? sample.hsnId,
    description,
    uqc,
    totalQuantity,
    grossValue,
    salesReturnValue,
    netTaxableValue,
    gstRate: sample.ratePct,
    gstRateLabel: `${sample.ratePct}%`,
    cgst,
    sgst,
    igst,
    cess,
    totalTax,
    status: exceptions.length > 0 ? "exception" : "valid",
    exceptions,
    sourceLines,
  };
}

function matchesRowFilters(row: HsnSummaryRow, filters: HsnSummaryFilters): boolean {
  const q = filters.hsnCode.trim().toLowerCase();
  if (q && !row.hsnCode.toLowerCase().includes(q) && !row.description.toLowerCase().includes(q)) {
    return false;
  }
  if (filters.gstRate !== "all") {
    const rate = Number(filters.gstRate);
    if (Math.round(row.gstRate) !== rate) return false;
  }
  if (filters.status === "valid" && row.status !== "valid") return false;
  if (filters.status === "exception" && row.status !== "exception") return false;
  return true;
}

function buildTotals(rows: HsnSummaryRow[]): HsnSummaryTotals {
  const hsnCodes = new Set(rows.map((r) => r.hsnCode).filter((c) => c && c !== "—"));
  return {
    totalHsnCodes: hsnCodes.size,
    totalQuantity: round2(rows.reduce((s, r) => s + r.totalQuantity, 0)),
    totalGrossValue: round2(rows.reduce((s, r) => s + r.grossValue, 0)),
    totalSalesReturnValue: round2(rows.reduce((s, r) => s + r.salesReturnValue, 0)),
    totalNetTaxableValue: round2(rows.reduce((s, r) => s + r.netTaxableValue, 0)),
    totalCgst: round2(rows.reduce((s, r) => s + r.cgst, 0)),
    totalSgst: round2(rows.reduce((s, r) => s + r.sgst, 0)),
    totalIgst: round2(rows.reduce((s, r) => s + r.igst, 0)),
    totalCess: round2(rows.reduce((s, r) => s + r.cess, 0)),
    totalExceptions: rows.filter((r) => r.status === "exception").length,
  };
}

function collectLineEvents(filters: HsnSummaryFilters): LineEvent[] {
  const events: LineEvent[] = [];

  for (const inv of loadInvoices()) {
    if (!isQualifyingSalesInvoice(inv)) continue;
    const branch = inv.branch?.trim() || "—";
    const warehouse = inv.warehouse?.trim() || "—";
    if (!matchesDocFilters(inv.invoiceDate, branch, warehouse, filters)) continue;
    for (const line of inv.lineItems) {
      const ev = invoiceLineToEvent(inv, line);
      if (ev) events.push(ev);
    }
  }

  for (const cn of loadCreditNotes()) {
    if (!isQualifyingCreditNote(cn)) continue;
    let branch = (cn as { branch?: string }).branch?.trim() || "—";
    let warehouse = "—";
    if (cn.sourceInvoiceId != null) {
      const inv = loadInvoices().find((i) => i.id === cn.sourceInvoiceId);
      branch = branch !== "—" ? branch : inv?.branch?.trim() || "—";
      warehouse = inv?.warehouse?.trim() || "—";
    }
    if (!matchesDocFilters(cn.creditNoteDate, branch, warehouse, filters)) continue;
    for (const line of cn.lineItems) {
      const ev = creditNoteLineToEvent(cn, line);
      if (ev) events.push(ev);
    }
  }

  return events;
}

export function buildHsnSummaryReport(filters: HsnSummaryFilters): HsnSummaryReport {
  const events = collectLineEvents(filters);
  const groups = new Map<string, LineEvent[]>();

  for (const ev of events) {
    const key = groupKey(ev);
    const list = groups.get(key) ?? [];
    list.push(ev);
    groups.set(key, list);
  }

  const rows: HsnSummaryRow[] = [];
  for (const [key, groupEvents] of groups) {
    const row = buildSummaryRow(key, groupEvents);
    if (!matchesRowFilters(row, filters)) continue;
    rows.push(row);
  }

  rows.sort(
    (a, b) =>
      a.hsnCode.localeCompare(b.hsnCode) ||
      a.gstRate - b.gstRate ||
      a.uqc.localeCompare(b.uqc),
  );

  return {
    rows,
    totals: buildTotals(rows),
    hasData: rows.length > 0,
  };
}

export function getHsnSummaryRowByKey(rowKey: string, filters: HsnSummaryFilters): HsnSummaryRow | undefined {
  return buildHsnSummaryReport(filters).rows.find((r) => r.rowKey === rowKey);
}

export function getHsnCodeOptions(): { code: string; description: string }[] {
  const map = new Map<string, string>();
  for (const inv of loadInvoices()) {
    if (!isQualifyingSalesInvoice(inv)) continue;
    for (const line of inv.lineItems) {
      const product = resolveProduct(line);
      const hsn = normalizeHsn(line.hsn?.trim() || product?.hsnCode?.trim() || "");
      if (!hsn) continue;
      const master = resolveHsnMaster(hsn);
      map.set(hsn, master?.hsnDescription || line.productName || hsn);
    }
  }
  return Array.from(map.entries())
    .map(([code, description]) => ({ code, description }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface ExceptionFixAction {
  label: string;
  href: string;
}

export function resolveHsnExceptionFixAction(
  code: GstExceptionCode,
  row: HsnSummaryRow,
): ExceptionFixAction | null {
  const sample = row.sourceLines[0];
  switch (code) {
    case "missing_hsn":
    case "invalid_hsn_format":
      if (row.hsnId != null) {
        return { label: "Fix HSN", href: `/masters/hsn/${row.hsnId}/edit` };
      }
      if (sample?.productId != null) {
        return { label: "Fix Product", href: `/masters/products/${sample.productId}/edit` };
      }
      return { label: "Open HSN Master", href: "/masters/hsn" };
    case "missing_uqc_unit":
      if (sample?.productId != null) {
        return { label: "Fix Product", href: `/masters/products/${sample.productId}/edit` };
      }
      return { label: "Open UOM Master", href: "/masters/uom" };
    case "missing_description":
    case "product_gst_rate_mismatch":
      if (sample?.productId != null) {
        return { label: "Fix Product", href: `/masters/products/${sample.productId}/edit` };
      }
      return { label: "Open HSN Master", href: "/masters/hsn" };
    case "taxable_value_mismatch":
    case "tax_amount_mismatch":
    case "quantity_mismatch":
    case "missing_gst_rate":
      if (sample?.invoiceId != null) {
        return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${sample.invoiceId}/edit` };
      }
      if (sample?.creditNoteId != null) {
        return {
          label: "Fix Credit Note",
          href: `/accounts/transactions/credit-notes/${sample.creditNoteId}/edit`,
        };
      }
      return null;
    default:
      if (sample?.invoiceId != null) {
        return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${sample.invoiceId}/edit` };
      }
      return null;
  }
}

export function parseHsnSummaryFiltersFromSearch(
  search: string,
  defaults: HsnSummaryFilters,
): HsnSummaryFilters {
  const params = new URLSearchParams(search);
  const gstRate = params.get("gstRate") as HsnGstRateFilter | null;
  const status = params.get("status") as HsnStatusFilter | null;
  const validRates: HsnGstRateFilter[] = ["all", "0", "5", "12", "18", "28"];
  const validStatus: HsnStatusFilter[] = ["all", "valid", "exception"];

  const branchParam = params.get("branch");
  const warehouseParam = params.get("warehouse");

  return {
    financialYearId: params.get("fy") ?? defaults.financialYearId,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    branch: branchParam != null ? parseMultiFilterParam(branchParam) : defaults.branch,
    warehouse: warehouseParam != null ? parseMultiFilterParam(warehouseParam) : defaults.warehouse,
    hsnCode: params.get("hsn") ?? defaults.hsnCode,
    gstRate: gstRate && validRates.includes(gstRate) ? gstRate : defaults.gstRate,
    status: status && validStatus.includes(status) ? status : defaults.status,
  };
}

export function buildHsnSummaryFilterQuery(filters: HsnSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  if (filters.hsnCode.trim()) params.set("hsn", filters.hsnCode.trim());
  if (filters.gstRate !== "all") params.set("gstRate", filters.gstRate);
  if (filters.status !== "all") params.set("status", filters.status);
  return params.toString();
}

export {
  getGstDashboardBranchOptions as getHsnSummaryBranchOptions,
  getGstDashboardWarehouseOptions as getHsnSummaryWarehouseOptions,
};
