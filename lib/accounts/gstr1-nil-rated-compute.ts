/**
 * GSTR-1 Nil Rated / Exempt / Non-GST supplies — line-level outward sales report.
 */

import {
  calcLineAmounts,
  loadInvoices,
  type InvoiceLineItem,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadHSNMasters } from "@/app/(app)/masters/hsn/hsn-data";
import {
  findGstMasterByRate,
  loadProducts,
  type Product,
} from "@/app/(app)/masters/products/product-data";
import { loadGSTMasters, type GSTMaster, type GstTaxType } from "@/app/(app)/masters/gst/gst-data";
import {
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  isQualifyingSalesInvoice,
  resolveCustomerGstin,
  type GstDashboardFilters,
  type GstExceptionCode,
  type GstExceptionIssue,
} from "@/lib/accounts/gst-summary-compute";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  matchesPrefixedIdFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";

export type NilSupplyType = "nil_rated" | "exempt" | "non_gst";
export type NilSupplyTypeFilter = "all" | NilSupplyType;
export type NilStatusFilter = "all" | "valid" | "exception";

export interface NilRatedExemptFilters extends GstDashboardFilters {
  customerId: string | string[];
  supplyType: NilSupplyTypeFilter;
  status: NilStatusFilter;
  invoiceNo: string;
}

export type NilRowStatus = "valid" | "exception";

export interface NilRatedExemptRow {
  rowKey: string;
  invoiceId: number;
  lineId: string;
  invoiceDate: string;
  invoiceNo: string;
  customerId: number | null;
  customerName: string;
  gstin: string;
  placeOfSupply: string;
  supplyType: NilSupplyType;
  supplyTypeLabel: string;
  productName: string;
  productId: number | null;
  hsn: string;
  hsnId: number | null;
  qty: number;
  unit: string;
  supplyValue: number;
  gstRate: number;
  gstRateLabel: string;
  taxTreatment: string;
  classificationReason: string;
  lineGstAmount: number;
  status: NilRowStatus;
  exceptions: GstExceptionIssue[];
  branch: string;
  warehouse: string;
  mixedInvoice: boolean;
}

export interface NilRatedExemptSummaryTotals {
  totalNilRatedValue: number;
  totalExemptValue: number;
  totalNonGstValue: number;
  totalDocuments: number;
  totalExceptions: number;
}

export interface NilRatedExemptReport {
  rows: NilRatedExemptRow[];
  totals: NilRatedExemptSummaryTotals;
  hasData: boolean;
}

const SUPPLY_TYPE_LABELS: Record<NilSupplyType, string> = {
  nil_rated: "Nil Rated",
  exempt: "Exempt",
  non_gst: "Non-GST",
};

function round2(n: number): number {
  return roundMoney(n);
}

function parseRatePct(rate: string | number | null | undefined): number | null {
  if (rate == null || rate === "") return null;
  if (typeof rate === "number") return Number.isFinite(rate) ? rate : null;
  const n = parseFloat(String(rate).replace(/%/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function resolveProduct(line: InvoiceLineItem): Product | undefined {
  if (line.productId != null) {
    return loadProducts().find((p) => p.id === line.productId);
  }
  const name = line.productName?.trim().toLowerCase();
  if (!name) return undefined;
  return loadProducts().find((p) => p.productName.trim().toLowerCase() === name);
}

function resolveHsn(code: string | undefined) {
  const trimmed = code?.trim();
  if (!trimmed) return undefined;
  return loadHSNMasters().find(
    (h) =>
      h.status === "active" &&
      (h.hsnCode === trimmed || h.hsnCode.startsWith(trimmed) || trimmed.startsWith(h.hsnCode)),
  );
}

function resolveGstMaster(product: Product | undefined, line: InvoiceLineItem, hsnCode: string): GSTMaster | undefined {
  if (product?.gstId != null) {
    const byId = loadGSTMasters().find((g) => g.id === product.gstId && g.status === "active");
    if (byId) return byId;
  }
  const rateCandidates = [
    product?.gstRate,
    line.taxPct != null ? `${line.taxPct}%` : "",
    resolveHsn(hsnCode)?.gstRate,
  ];
  for (const rate of rateCandidates) {
    if (!rate?.trim()) continue;
    const gst = findGstMasterByRate(rate);
    if (gst) return gst;
  }
  return undefined;
}

function treatmentHintText(
  inv: InvoiceRecord,
  gst: GSTMaster | undefined,
  product: Product | undefined,
): string {
  return [inv.gstTreatment, gst?.taxType, gst?.gstName, gst?.remarks, product?.gstRate]
    .filter((v) => v && String(v).trim())
    .join(" ");
}

interface SupplyClassification {
  type: NilSupplyType;
  taxTreatment: string;
  reason: string;
  hasExplicitTreatment: boolean;
  gstMaster: GSTMaster | undefined;
}

/**
 * Classify a line using GST Master tax type, product/HSN mapping, and invoice treatment.
 * Does not treat every 0% line as Exempt — uses actual tax-treatment type.
 */
function classifyLineSupplyType(
  inv: InvoiceRecord,
  line: InvoiceLineItem,
  product: Product | undefined,
  hsnCode: string,
): SupplyClassification | null {
  const gst = resolveGstMaster(product, line, hsnCode);
  const hints = treatmentHintText(inv, gst, product);
  const lineRate = line.taxPct ?? 0;
  const productRate = parseRatePct(product?.gstRate);
  const hsnRate = parseRatePct(resolveHsn(hsnCode)?.gstRate);
  const taxType = gst?.taxType as GstTaxType | undefined;

  const isRegularTaxable =
    lineRate > 0 &&
    (taxType === "CGST_SGST" || taxType === "IGST" || (!taxType && productRate != null && productRate > 0));

  // Explicit Non-GST (invoice / master remarks)
  if (/non[-\s]?gst|out(?:side)?\s+of\s+(?:the\s+)?scope|outside\s+gst/i.test(hints)) {
    return {
      type: "non_gst",
      taxTreatment: "Non-GST",
      reason: "Supply marked as outside the scope of GST",
      hasExplicitTreatment: true,
      gstMaster: gst,
    };
  }

  // Explicit Exempt
  if (taxType === "Exempt" || /\bexempt\b/i.test(inv.gstTreatment ?? "")) {
    return {
      type: "exempt",
      taxTreatment: "Exempt",
      reason: taxType === "Exempt"
        ? "GST Master tax type is Exempt"
        : "Invoice GST treatment marked as Exempt",
      hasExplicitTreatment: true,
      gstMaster: gst,
    };
  }

  // Explicit Nil Rated
  if (taxType === "Nil Rated" || /nil\s*rated/i.test(inv.gstTreatment ?? "")) {
    return {
      type: "nil_rated",
      taxTreatment: "Nil Rated",
      reason: taxType === "Nil Rated"
        ? "GST Master tax type is Nil Rated (0% taxable under GST)"
        : "Invoice GST treatment marked as Nil Rated",
      hasExplicitTreatment: true,
      gstMaster: gst,
    };
  }

  // Zero Rated → Nil Rated for GSTR-1 (0% under GST, not exempt)
  if (taxType === "Zero Rated") {
    return {
      type: "nil_rated",
      taxTreatment: "Nil Rated",
      reason: "GST Master tax type is Zero Rated (0% under GST)",
      hasExplicitTreatment: true,
      gstMaster: gst,
    };
  }

  // Regular taxable lines are excluded (unless already caught as exempt/nil above with tax charged)
  if (isRegularTaxable) return null;

  // 0% line without explicit treatment — candidate Nil Rated with missing-treatment exception
  if (lineRate <= 0 || productRate === 0 || hsnRate === 0) {
    const hasZeroMapping =
      productRate === 0 || hsnRate === 0 || (gst != null && gst.gstPercentage === 0);
    return {
      type: "nil_rated",
      taxTreatment: hasZeroMapping ? "Nil Rated" : "Unspecified",
      reason: hasZeroMapping
        ? "0% GST rate from product/HSN mapping — treated as Nil Rated under GST"
        : "0% GST rate on invoice line without tax-treatment classification",
      hasExplicitTreatment: hasZeroMapping && gst != null,
      gstMaster: gst,
    };
  }

  return null;
}

function detectNilLineExceptions(
  inv: InvoiceRecord,
  line: InvoiceLineItem,
  classification: SupplyClassification,
  hsnCode: string,
  lineGstAmount: number,
): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];

  if (!inv.invoiceNo?.trim()) {
    issues.push({ code: "missing_document_no", message: "Missing invoice number" });
  }
  if (!inv.invoiceDate?.trim()) {
    issues.push({ code: "missing_document_date", message: "Missing invoice date" });
  }
  if (!inv.placeOfSupply?.trim()) {
    issues.push({ code: "missing_place_of_supply", message: "Missing place of supply" });
  }
  if (!hsnCode.trim()) {
    issues.push({ code: "missing_hsn", message: "Missing HSN / SAC code" });
  }

  if (!classification.hasExplicitTreatment && (line.taxPct ?? 0) <= 0) {
    issues.push({
      code: "missing_tax_treatment",
      message: "GST rate is 0%, but tax treatment is not selected",
    });
  }

  if (classification.type === "exempt" && !classification.hasExplicitTreatment) {
    issues.push({
      code: "missing_exemption_classification",
      message: "Exempt product without exemption classification",
    });
  }

  // Product mapped as taxable but line forced to 0% (or vice versa)
  const product = resolveProduct(line);
  const productRate = parseRatePct(product?.gstRate);
  if (
    productRate != null &&
    productRate > 0 &&
    (line.taxPct ?? 0) <= 0 &&
    classification.type === "nil_rated"
  ) {
    issues.push({
      code: "incorrect_tax_treatment",
      message: "Incorrect tax treatment — product GST rate is taxable but line is 0%",
    });
  }

  if (
    classification.gstMaster &&
    (classification.gstMaster.taxType === "CGST_SGST" || classification.gstMaster.taxType === "IGST") &&
    (line.taxPct ?? 0) <= 0
  ) {
    issues.push({
      code: "incorrect_tax_treatment",
      message: "Incorrect tax treatment — GST Master is taxable but line rate is 0%",
    });
  }

  if (
    (classification.type === "exempt" ||
      classification.type === "nil_rated" ||
      classification.type === "non_gst") &&
    (lineGstAmount > 0.05 || (line.taxPct ?? 0) > 0)
  ) {
    issues.push({
      code: "gst_charged_on_exempt_or_nil",
      message: "GST amount charged on an exempt, nil-rated, or non-GST item",
    });
  }

  return issues;
}

function invoiceHasTaxableLines(inv: InvoiceRecord): boolean {
  return inv.lineItems.some((l) => l.qty > 0 && (l.taxPct ?? 0) > 0);
}

function matchesBaseFilters(inv: InvoiceRecord, filters: NilRatedExemptFilters): boolean {
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

function lineToRow(inv: InvoiceRecord, line: InvoiceLineItem): NilRatedExemptRow | null {
  if (line.qty <= 0) return null;

  const product = resolveProduct(line);
  const hsnCode = line.hsn?.trim() || product?.hsnCode?.trim() || "";
  const classification = classifyLineSupplyType(inv, line, product, hsnCode);
  if (!classification) return null;

  const { taxable } = calcLineAmounts(line);
  const lineGstAmount = round2(Math.max(0, (line.amount ?? 0) - taxable));
  // Prefer explicit line tax from rate when amount field may include tax
  const taxFromRate = round2(taxable * ((line.taxPct ?? 0) / 100));
  const gstCharged = Math.max(lineGstAmount, taxFromRate);

  const exceptions = detectNilLineExceptions(
    inv,
    line,
    classification,
    hsnCode,
    gstCharged,
  );

  return {
    rowKey: `inv-${inv.id}-line-${line.id}`,
    invoiceId: inv.id,
    lineId: line.id,
    invoiceDate: inv.invoiceDate.slice(0, 10),
    invoiceNo: inv.invoiceNo,
    customerId: inv.customerId,
    customerName: inv.customerName || "—",
    gstin: resolveCustomerGstin(inv.customerId, inv.customerGst) || "—",
    placeOfSupply: inv.placeOfSupply?.trim() || "—",
    supplyType: classification.type,
    supplyTypeLabel: SUPPLY_TYPE_LABELS[classification.type],
    productName: line.productName || line.description || "—",
    productId: line.productId ?? product?.id ?? null,
    hsn: hsnCode || "—",
    hsnId: resolveHsn(hsnCode)?.id ?? product?.hsnId ?? null,
    qty: line.qty,
    unit: line.unit || "—",
    supplyValue: taxable,
    gstRate: line.taxPct ?? 0,
    gstRateLabel: `${line.taxPct ?? 0}%`,
    taxTreatment: classification.taxTreatment,
    classificationReason: classification.reason,
    lineGstAmount: gstCharged,
    status: exceptions.length > 0 ? "exception" : "valid",
    exceptions,
    branch: inv.branch?.trim() || "—",
    warehouse: inv.warehouse?.trim() || "—",
    mixedInvoice: invoiceHasTaxableLines(inv),
  };
}

function matchesRowFilters(row: NilRatedExemptRow, filters: NilRatedExemptFilters): boolean {
  if (!matchesPrefixedIdFilter(filters.customerId, row.customerId, "customer:")) return false;
  if (filters.supplyType !== "all" && row.supplyType !== filters.supplyType) return false;
  const q = filters.invoiceNo.trim().toLowerCase();
  if (q && !row.invoiceNo.toLowerCase().includes(q) && !row.productName.toLowerCase().includes(q)) {
    return false;
  }
  if (filters.status === "valid" && row.status !== "valid") return false;
  if (filters.status === "exception" && row.status !== "exception") return false;
  return true;
}

function buildTotals(rows: NilRatedExemptRow[]): NilRatedExemptSummaryTotals {
  const invoiceIds = new Set(rows.map((r) => r.invoiceId));
  return {
    totalNilRatedValue: round2(
      rows.filter((r) => r.supplyType === "nil_rated").reduce((s, r) => s + r.supplyValue, 0),
    ),
    totalExemptValue: round2(
      rows.filter((r) => r.supplyType === "exempt").reduce((s, r) => s + r.supplyValue, 0),
    ),
    totalNonGstValue: round2(
      rows.filter((r) => r.supplyType === "non_gst").reduce((s, r) => s + r.supplyValue, 0),
    ),
    totalDocuments: invoiceIds.size,
    totalExceptions: rows.filter((r) => r.status === "exception").length,
  };
}

export function buildNilRatedExemptReport(filters: NilRatedExemptFilters): NilRatedExemptReport {
  const rows: NilRatedExemptRow[] = [];

  for (const inv of loadInvoices()) {
    if (!isQualifyingSalesInvoice(inv)) continue;
    if (!matchesBaseFilters(inv, filters)) continue;

    for (const line of inv.lineItems) {
      const row = lineToRow(inv, line);
      if (!row) continue;
      if (!matchesRowFilters(row, filters)) continue;
      rows.push(row);
    }
  }

  rows.sort(
    (a, b) =>
      b.invoiceDate.localeCompare(a.invoiceDate) ||
      b.invoiceNo.localeCompare(a.invoiceNo) ||
      a.productName.localeCompare(b.productName),
  );

  return {
    rows,
    totals: buildTotals(rows),
    hasData: rows.length > 0,
  };
}

export function getNilRatedCustomerOptions(): { id: string; name: string }[] {
  const map = new Map<number, string>();
  for (const inv of loadInvoices()) {
    if (!isQualifyingSalesInvoice(inv)) continue;
    for (const line of inv.lineItems) {
      const row = lineToRow(inv, line);
      if (!row) continue;
      if (row.customerId != null && row.customerName) {
        map.set(row.customerId, row.customerName);
      }
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id: `customer:${id}`, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getNilRatedRowByKey(rowKey: string): NilRatedExemptRow | undefined {
  const match = /^inv-(\d+)-line-(.+)$/.exec(rowKey);
  if (!match) return undefined;
  const invoiceId = Number(match[1]);
  const lineId = match[2];
  const inv = loadInvoices().find((i) => i.id === invoiceId);
  if (!inv || !isQualifyingSalesInvoice(inv)) return undefined;
  const line = inv.lineItems.find((l) => l.id === lineId);
  if (!line) return undefined;
  return lineToRow(inv, line) ?? undefined;
}

export interface ExceptionFixAction {
  label: string;
  href: string;
}

export function resolveNilRatedExceptionFixAction(
  code: GstExceptionCode,
  row: NilRatedExemptRow,
): ExceptionFixAction | null {
  switch (code) {
    case "missing_hsn":
      if (row.hsnId != null) {
        return { label: "Fix HSN", href: `/masters/hsn/${row.hsnId}/edit` };
      }
      if (row.productId != null) {
        return { label: "Fix Product", href: `/masters/products/${row.productId}/edit` };
      }
      return { label: "Open HSN Master", href: "/masters/hsn" };
    case "missing_tax_treatment":
    case "missing_exemption_classification":
    case "incorrect_tax_treatment":
    case "gst_charged_on_exempt_or_nil":
    case "missing_gst_rate":
      if (row.productId != null) {
        return { label: "Fix Product", href: `/masters/products/${row.productId}/edit` };
      }
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${row.invoiceId}/edit` };
    case "missing_place_of_supply":
    case "missing_customer_state":
    case "missing_gstin_registered":
    case "invalid_gstin":
      if (row.customerId != null) {
        return { label: "Fix Customer", href: `/masters/customers/${row.customerId}/edit` };
      }
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${row.invoiceId}/edit` };
    default:
      return { label: "Fix Invoice", href: `/accounts/transactions/invoices/${row.invoiceId}/edit` };
  }
}

export function parseNilRatedFiltersFromSearch(
  search: string,
  defaults: NilRatedExemptFilters,
): NilRatedExemptFilters {
  const params = new URLSearchParams(search);
  const supplyType = params.get("supplyType") as NilSupplyTypeFilter | null;
  const status = params.get("status") as NilStatusFilter | null;
  const validSupply: NilSupplyTypeFilter[] = ["all", "nil_rated", "exempt", "non_gst"];
  const validStatus: NilStatusFilter[] = ["all", "valid", "exception"];

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
    supplyType: supplyType && validSupply.includes(supplyType) ? supplyType : defaults.supplyType,
    status: status && validStatus.includes(status) ? status : defaults.status,
    invoiceNo: params.get("invoiceNo") ?? defaults.invoiceNo,
  };
}

export function buildNilRatedFilterQuery(filters: NilRatedExemptFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  appendMultiFilterParam(params, "customer", filters.customerId);
  if (filters.supplyType !== "all") params.set("supplyType", filters.supplyType);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.invoiceNo.trim()) params.set("invoiceNo", filters.invoiceNo.trim());
  return params.toString();
}

export {
  getGstDashboardBranchOptions as getNilRatedBranchOptions,
  getGstDashboardWarehouseOptions as getNilRatedWarehouseOptions,
  SUPPLY_TYPE_LABELS,
};
