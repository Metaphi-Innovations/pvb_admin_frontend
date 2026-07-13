/**
 * GST Summary Dashboard — outward supply aggregation for GSTR-1 preview.
 */

import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes, type DebitNoteRecord } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadCustomers, validateGSTIN } from "@/app/(app)/masters/customers/customer-data";
import { aggregateLineGst, inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import {
  getInvoiceGstBreakup,
  isInterstateGst,
} from "@/lib/accounts/invoice-gst-breakup";
import { computeNoteTaxBreakup } from "@/lib/accounts/note-tax-breakup";
import { resolveInvoiceDocumentType } from "@/lib/accounts/invoice-type";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  getTrialBalanceBranchOptions,
  getTrialBalanceWarehouseOptions,
} from "@/lib/accounts/trial-balance-compute";
import { resolveFinancialYearLabel } from "@/lib/accounts/pl-compute";
import { matchesMultiFilter, appendMultiFilterParam, parseMultiFilterParam } from "@/lib/accounts/report-multi-filter-utils";

export type Gstr1SectionId =
  | "b2b"
  | "b2c"
  | "exports"
  | "credit-notes-registered"
  | "credit-notes-unregistered"
  | "debit-notes-registered"
  | "debit-notes-unregistered"
  | "nil-rated-exempt"
  | "hsn-summary"
  | "documents-summary"
  | "tax-summary"
  | "exceptions";

export const GSTR1_SECTION_LABELS: Record<Gstr1SectionId, string> = {
  b2b: "B2B Invoices",
  b2c: "B2C Invoices",
  exports: "Exports",
  "credit-notes-registered": "Credit Notes – Registered",
  "credit-notes-unregistered": "Credit Notes – Unregistered",
  "debit-notes-registered": "Debit Notes – Registered",
  "debit-notes-unregistered": "Debit Notes – Unregistered",
  "nil-rated-exempt": "Nil Rated / Exempt Supplies",
  "hsn-summary": "HSN-wise Summary",
  "documents-summary": "Documents Summary",
  "tax-summary": "Tax Summary",
  exceptions: "Exceptions",
};

export interface GstDashboardFilters {
  financialYearId: string;
  dateFrom: string;
  dateTo: string;
  branch: string | string[];
  warehouse: string | string[];
}

export type GstOutwardDocType = "sales_invoice" | "credit_note" | "debit_note";

export type GstExceptionCode =
  | "missing_gstin_registered"
  | "invalid_gstin"
  | "missing_hsn"
  | "missing_gst_rate"
  | "missing_customer_state"
  | "missing_place_of_supply"
  | "incorrect_tax_split"
  | "tax_amount_mismatch"
  | "missing_document_no"
  | "missing_document_date"
  | "duplicate_document_no"
  | "invoice_total_mismatch"
  | "missing_original_invoice"
  | "missing_reason"
  | "missing_tax_treatment"
  | "missing_exemption_classification"
  | "incorrect_tax_treatment"
  | "gst_charged_on_exempt_or_nil"
  | "invalid_hsn_format"
  | "missing_description"
  | "missing_uqc_unit"
  | "product_gst_rate_mismatch"
  | "quantity_mismatch"
  | "taxable_value_mismatch";

export interface GstExceptionIssue {
  code: GstExceptionCode;
  message: string;
}

export interface GstOutwardTransaction {
  id: string;
  docType: GstOutwardDocType;
  sourceId: number;
  documentNo: string;
  documentDate: string;
  partyName: string;
  gstin: string;
  section: Gstr1SectionId;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  taxAmount: number;
  branch: string;
  warehouse: string;
  exceptions: GstExceptionIssue[];
}

export interface GstSummaryCards {
  totalSalesInvoices: number;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
  totalCreditNotes: number;
  totalDebitNotes: number;
  totalNilRatedExemptValue: number;
  totalExceptions: number;
}

export interface Gstr1SectionRow {
  sectionId: Gstr1SectionId;
  section: string;
  documentCount: number;
  taxableValue: number;
  taxAmount: number;
  exceptions: number;
}

export interface GstDashboardResult {
  cards: GstSummaryCards;
  sections: Gstr1SectionRow[];
  transactions: GstOutwardTransaction[];
  hasData: boolean;
}

const QUALIFYING_CN_STATUSES = new Set(["posted", "approved", "processed"]);
const QUALIFYING_DN_STATUSES = new Set(["posted", "approved", "processed"]);

function round2(n: number): number {
  return roundMoney(n);
}

function matchesFinancialYear(date: string, financialYearId: string): boolean {
  if (financialYearId === "all" || !financialYearId) return true;
  const fy = loadFinancialYears().find((f) => String(f.id) === financialYearId);
  if (!fy) return true;
  const d = date.slice(0, 10);
  return d >= fy.startDate && d <= fy.endDate;
}

function matchesDateRange(date: string, from: string, to: string): boolean {
  const d = date.slice(0, 10);
  return d >= from && d <= to;
}

function matchesBranchWarehouse(
  branch: string | string[],
  warehouse: string | string[],
  docBranch: string,
  docWarehouse: string,
): boolean {
  if (!matchesMultiFilter(branch, docBranch)) return false;
  if (!matchesMultiFilter(warehouse, docWarehouse)) return false;
  return true;
}

function documentMatchesFilters(
  date: string,
  docBranch: string,
  docWarehouse: string,
  filters: GstDashboardFilters,
): boolean {
  if (!matchesFinancialYear(date, filters.financialYearId)) return false;
  if (!matchesDateRange(date, filters.dateFrom, filters.dateTo)) return false;
  return matchesBranchWarehouse(filters.branch, filters.warehouse, docBranch, docWarehouse);
}

export function resolveCustomerGstin(customerId: number | null, fallbackGst?: string): string {
  const trimmed = fallbackGst?.trim() ?? "";
  if (trimmed) return trimmed;
  if (customerId == null) return "";
  const customer = loadCustomers().find((c) => c.id === customerId);
  return customer?.gstin?.trim() ?? "";
}

export function resolveCustomerState(customerId: number | null, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();
  if (customerId == null) return "";
  const customer = loadCustomers().find((c) => c.id === customerId);
  return customer?.stateName?.trim() ?? "";
}

export function isCustomerGstRegistered(
  customerId: number | null,
  gstin?: string,
  gstCategory?: string,
): boolean {
  const resolved = gstin?.trim() || resolveCustomerGstin(customerId);
  if (resolved && validateGSTIN(resolved)) return true;
  if (customerId == null) return false;
  const customer = loadCustomers().find((c) => c.id === customerId);
  if (!customer) return false;
  if (customer.gstApplicable) {
    if (customer.gstin?.trim() && validateGSTIN(customer.gstin)) return true;
    if (customer.gstCategory && customer.gstCategory !== "unregistered") return true;
  }
  if (gstCategory && !/unregistered/i.test(gstCategory)) return true;
  return false;
}

export function isExportSupply(
  inv: Pick<
    InvoiceRecord,
    "gstTreatment" | "customerGstCategory" | "sezSupplyType" | "placeOfSupply" | "lutNumber"
  >,
): boolean {
  if (/export|overseas/i.test(inv.gstTreatment ?? "")) return true;
  if (/export|overseas/i.test(inv.customerGstCategory ?? "")) return true;
  if (inv.sezSupplyType && inv.lutNumber?.trim()) return true;
  if (/export/i.test(inv.placeOfSupply ?? "")) return true;
  return false;
}

export function isNilRatedOrExemptInvoice(inv: InvoiceRecord): boolean {
  const activeLines = inv.lineItems.filter((l) => l.qty > 0);
  if (activeLines.length === 0) return inv.taxAmount <= 0;
  return activeLines.every((l) => (l.taxPct ?? 0) <= 0);
}

function isNilRatedOrExemptCreditNote(cn: CreditNoteRecord): boolean {
  const activeLines = cn.lineItems.filter((l) => (l.returnQty ?? 0) > 0 || (l.creditAmount ?? 0) > 0);
  if (activeLines.length === 0) return cn.taxCreditAmount <= 0;
  return activeLines.every((l) => (l.taxPct ?? 0) <= 0);
}

/** B2B eligibility — GST-registered customer, not export, not cancelled. */
export function isB2bEligibleInvoice(inv: InvoiceRecord): boolean {
  if (!isQualifyingSalesInvoice(inv)) return false;
  if (isExportSupply(inv)) return false;
  if (isNilRatedOrExemptInvoice(inv)) return false;
  if (!isCustomerGstRegistered(inv.customerId, inv.customerGst, inv.customerGstCategory)) {
    return false;
  }
  if (inv.customerId != null) {
    const customer = loadCustomers().find((c) => c.id === inv.customerId);
    if (customer && !customer.gstApplicable) return false;
  }
  return true;
}

/** Genuine unregistered customer — not GST-registered in master or invoice. */
export function isGenuinelyUnregisteredCustomer(
  customerId: number | null,
  gstin?: string,
  gstCategory?: string,
): boolean {
  const resolvedGstin = gstin?.trim() || resolveCustomerGstin(customerId);
  if (resolvedGstin && validateGSTIN(resolvedGstin)) return false;

  if (customerId != null) {
    const customer = loadCustomers().find((c) => c.id === customerId);
    if (customer) {
      if (customer.gstApplicable) return false;
      if (customer.gstCategory && customer.gstCategory !== "unregistered") return false;
    }
  }

  if (isCustomerGstRegistered(customerId, gstin, gstCategory)) return false;
  return true;
}

/** B2C eligibility — unregistered customer only; excludes B2B, export, cancelled. */
export function isB2cEligibleInvoice(inv: InvoiceRecord): boolean {
  if (!isQualifyingSalesInvoice(inv)) return false;
  if (isExportSupply(inv)) return false;
  if (isNilRatedOrExemptInvoice(inv)) return false;
  if (isB2bEligibleInvoice(inv)) return false;
  return isGenuinelyUnregisteredCustomer(
    inv.customerId,
    inv.customerGst,
    inv.customerGstCategory,
  );
}

function classifyInvoiceSection(inv: InvoiceRecord): Gstr1SectionId {
  if (isExportSupply(inv)) return "exports";
  if (isNilRatedOrExemptInvoice(inv)) return "nil-rated-exempt";
  if (isB2bEligibleInvoice(inv)) return "b2b";
  if (isB2cEligibleInvoice(inv)) return "b2c";
  return "exceptions";
}

export function isQualifyingSalesInvoice(inv: InvoiceRecord): boolean {
  if (inv.invoiceStatus === "cancelled" || inv.invoiceStatus === "draft") return false;
  if (resolveInvoiceDocumentType(inv) === "stock_transfer") return false;
  const ws = inv.workflow?.status;
  if (ws && ["draft", "cancelled", "rejected", "sent_back"].includes(ws)) return false;
  return true;
}

export function isQualifyingCreditNote(cn: CreditNoteRecord): boolean {
  return QUALIFYING_CN_STATUSES.has(cn.status);
}

/** Outward debit notes — customer-facing only (future-ready). */
export function isOutwardDebitNote(dn: DebitNoteRecord): boolean {
  const customerId = (dn as { customerId?: number | null }).customerId;
  if (customerId != null) return true;
  const against = (dn as { againstType?: string }).againstType;
  return against === "sales_invoice";
}

export function isQualifyingDebitNote(dn: DebitNoteRecord): boolean {
  if (!isOutwardDebitNote(dn)) return false;
  return QUALIFYING_DN_STATUSES.has(dn.status);
}

function invoiceTaxFromLines(inv: InvoiceRecord): {
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
} {
  const interstate = isInterstateGst(inv.gstTreatment, inv.placeOfSupply, inv.state);
  const split = aggregateLineGst(
    inv.lineItems.map((l) => ({
      qty: l.qty,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      taxPct: l.taxPct,
    })),
    interstate,
  );
  const taxAmount = round2(split.cgst + split.sgst + split.igst);
  return { ...split, taxAmount };
}

function creditNoteTaxFromRecord(cn: CreditNoteRecord): {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
} {
  return {
    taxableValue: cn.taxableValue,
    cgst: cn.cgstAmount,
    sgst: cn.sgstAmount,
    igst: cn.igstAmount,
    taxAmount: round2(cn.cgstAmount + cn.sgstAmount + cn.igstAmount),
  };
}

function debitNoteTaxFromRecord(dn: DebitNoteRecord): {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxAmount: number;
} {
  return {
    taxableValue: dn.taxableAmount,
    cgst: dn.cgstAmount,
    sgst: dn.sgstAmount,
    igst: dn.igstAmount,
    taxAmount: round2(dn.cgstAmount + dn.sgstAmount + dn.igstAmount),
  };
}

interface LineIssueInput {
  hsn?: string;
  taxPct?: number;
  qty?: number;
  returnQty?: number;
}

function detectLineIssues(lines: LineIssueInput[]): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];
  for (const line of lines) {
    const qty = line.returnQty ?? line.qty ?? 0;
    if (qty <= 0) continue;
    if (!line.hsn?.trim()) {
      issues.push({ code: "missing_hsn", message: "Missing HSN on line item" });
    }
    if (line.taxPct == null || Number.isNaN(line.taxPct)) {
      issues.push({ code: "missing_gst_rate", message: "Missing GST rate on line item" });
    }
  }
  return issues;
}

function detectTaxSplitIssue(
  interstate: boolean,
  cgst: number,
  sgst: number,
  igst: number,
  taxAmount: number,
): GstExceptionIssue | null {
  const total = round2(cgst + sgst + igst);
  if (Math.abs(total - taxAmount) > 0.05) {
    return { code: "tax_amount_mismatch", message: "Tax component total does not match tax amount" };
  }
  if (interstate) {
    if ((cgst > 0 || sgst > 0) && igst <= 0) {
      return { code: "incorrect_tax_split", message: "Interstate supply should use IGST" };
    }
  } else if (igst > 0 && (cgst > 0 || sgst > 0)) {
    return { code: "incorrect_tax_split", message: "Intrastate supply should use CGST/SGST, not IGST" };
  } else if (igst > 0 && cgst <= 0 && sgst <= 0 && taxAmount > 0) {
    return { code: "incorrect_tax_split", message: "Intrastate supply should use CGST/SGST" };
  }
  return null;
}

export function detectSalesInvoiceExceptions(
  inv: InvoiceRecord,
  duplicateNos: Set<string>,
): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];

  if (!inv.invoiceNo?.trim()) {
    issues.push({ code: "missing_document_no", message: "Missing invoice number" });
  } else if (duplicateNos.has(inv.invoiceNo.trim().toLowerCase())) {
    issues.push({ code: "duplicate_document_no", message: "Duplicate invoice number" });
  }
  if (!inv.invoiceDate?.trim()) {
    issues.push({ code: "missing_document_date", message: "Missing invoice date" });
  }

  const registered = isCustomerGstRegistered(
    inv.customerId,
    inv.customerGst,
    inv.customerGstCategory,
  );
  const gstin = resolveCustomerGstin(inv.customerId, inv.customerGst);
  if (registered && !gstin) {
    issues.push({ code: "missing_gstin_registered", message: "Missing GSTIN for registered customer" });
  }
  if (gstin && !validateGSTIN(gstin)) {
    issues.push({ code: "invalid_gstin", message: "Invalid GSTIN format" });
  }
  if (!resolveCustomerState(inv.customerId, inv.state)) {
    issues.push({ code: "missing_customer_state", message: "Missing customer state" });
  }
  if (!inv.placeOfSupply?.trim()) {
    issues.push({ code: "missing_place_of_supply", message: "Missing place of supply" });
  }

  issues.push(
    ...detectLineIssues(
      inv.lineItems.map((l) => ({
        hsn: l.hsn,
        taxPct: l.taxPct,
        qty: l.qty,
      })),
    ),
  );

  const breakup = getInvoiceGstBreakup(inv);
  const lineTax = invoiceTaxFromLines(inv);
  if (Math.abs(lineTax.taxAmount - inv.taxAmount) > 0.05) {
    issues.push({ code: "tax_amount_mismatch", message: "Header tax amount does not match line totals" });
  }
  const splitIssue = detectTaxSplitIssue(
    breakup.interstate,
    breakup.cgst,
    breakup.sgst,
    breakup.igst,
    inv.taxAmount,
  );
  if (splitIssue) issues.push(splitIssue);

  const expectedTotal = round2(inv.subtotal - inv.discountTotal + inv.taxAmount);
  if (Math.abs(expectedTotal - inv.grandTotal) > 0.05) {
    issues.push({
      code: "invoice_total_mismatch",
      message: "Invoice total does not match taxable value plus tax",
    });
  }

  return issues;
}

export function detectCreditNoteExceptions(
  cn: CreditNoteRecord,
  duplicateNos: Set<string>,
): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];

  if (!cn.creditNoteNo?.trim()) {
    issues.push({ code: "missing_document_no", message: "Missing credit note number" });
  } else if (duplicateNos.has(cn.creditNoteNo.trim().toLowerCase())) {
    issues.push({ code: "duplicate_document_no", message: "Duplicate credit note number" });
  }
  if (!cn.creditNoteDate?.trim()) {
    issues.push({ code: "missing_document_date", message: "Missing credit note date" });
  }

  const gstin = resolveCustomerGstin(cn.customerId);
  const registered = isCustomerGstRegistered(cn.customerId, gstin);
  if (registered && !gstin) {
    issues.push({ code: "missing_gstin_registered", message: "Missing GSTIN for registered customer" });
  }
  if (gstin && !validateGSTIN(gstin)) {
    issues.push({ code: "invalid_gstin", message: "Invalid GSTIN format" });
  }
  if (!resolveCustomerState(cn.customerId)) {
    issues.push({ code: "missing_customer_state", message: "Missing customer state" });
  }
  const placeOfSupply = (cn as { placeOfSupply?: string }).placeOfSupply;
  if (!placeOfSupply?.trim()) {
    issues.push({ code: "missing_place_of_supply", message: "Missing place of supply" });
  }

  if (cn.againstType === "sales_invoice") {
    const invId = cn.sourceInvoiceId ?? cn.linkedInvoices?.[0]?.id ?? null;
    const invNo =
      cn.sourceInvoiceNo?.trim() || cn.linkedInvoices?.[0]?.invoiceNo?.trim() || "";
    let found = false;
    if (invId != null) {
      found = loadInvoices().some((i) => i.id === invId);
    } else if (invNo) {
      found = loadInvoices().some((i) => i.invoiceNo === invNo);
    }
    if (!found) {
      issues.push({
        code: "missing_original_invoice",
        message: "Missing original invoice reference",
      });
    }
  }

  if (!cn.reason?.trim()) {
    issues.push({ code: "missing_reason", message: "Missing reason for credit/debit note" });
  }

  issues.push(
    ...detectLineIssues(
      cn.lineItems.map((l) => ({
        hsn: l.hsn,
        taxPct: l.taxPct,
        returnQty: l.returnQty,
      })),
    ),
  );

  const interstate = inferInterstateFromPlaceOfSupply(
    placeOfSupply,
    resolveCustomerState(cn.customerId),
  );
  const computed = computeNoteTaxBreakup(cn.lineItems, interstate);
  if (Math.abs(computed.taxableValue - cn.taxableValue) > 0.05) {
    issues.push({
      code: "tax_amount_mismatch",
      message: "Taxable value does not match line totals",
    });
  }

  const tax = creditNoteTaxFromRecord(cn);
  if (Math.abs(tax.taxAmount - cn.taxCreditAmount) > 0.05) {
    issues.push({ code: "tax_amount_mismatch", message: "Tax credit amount does not match component split" });
  }

  const splitIssue = detectTaxSplitIssue(
    interstate,
    cn.cgstAmount,
    cn.sgstAmount,
    cn.igstAmount,
    tax.taxAmount,
  );
  if (splitIssue) issues.push(splitIssue);

  return issues;
}

export function detectDebitNoteExceptions(
  dn: DebitNoteRecord,
  duplicateNos: Set<string>,
): GstExceptionIssue[] {
  const issues: GstExceptionIssue[] = [];
  if (!isOutwardDebitNote(dn)) return issues;

  if (!dn.debitNoteNo?.trim()) {
    issues.push({ code: "missing_document_no", message: "Missing debit note number" });
  } else if (duplicateNos.has(dn.debitNoteNo.trim().toLowerCase())) {
    issues.push({ code: "duplicate_document_no", message: "Duplicate debit note number" });
  }
  if (!dn.debitNoteDate?.trim()) {
    issues.push({ code: "missing_document_date", message: "Missing debit note date" });
  }

  const customerId = (dn as { customerId?: number | null }).customerId ?? null;
  const gstin = resolveCustomerGstin(
    customerId,
    (dn as { customerGstin?: string }).customerGstin,
  );
  const registered = isCustomerGstRegistered(customerId, gstin);
  if (registered && !gstin) {
    issues.push({ code: "missing_gstin_registered", message: "Missing GSTIN for registered customer" });
  }
  if (gstin && !validateGSTIN(gstin)) {
    issues.push({ code: "invalid_gstin", message: "Invalid GSTIN format" });
  }
  if (!resolveCustomerState(customerId)) {
    issues.push({ code: "missing_customer_state", message: "Missing customer state" });
  }
  const placeOfSupply = (dn as { placeOfSupply?: string }).placeOfSupply;
  if (!placeOfSupply?.trim()) {
    issues.push({ code: "missing_place_of_supply", message: "Missing place of supply" });
  }

  const against = (dn as { againstType?: string }).againstType;
  if (against === "sales_invoice") {
    const invId = dn.sourceInvoiceId;
    const invNo = dn.sourceInvoiceNo?.trim() || "";
    let found = false;
    if (invId != null) {
      found = loadInvoices().some((i) => i.id === invId);
    } else if (invNo) {
      found = loadInvoices().some((i) => i.invoiceNo === invNo);
    }
    if (!found) {
      issues.push({
        code: "missing_original_invoice",
        message: "Missing original invoice reference",
      });
    }
  }

  if (!dn.reason?.trim()) {
    issues.push({ code: "missing_reason", message: "Missing reason for credit/debit note" });
  }

  issues.push(
    ...detectLineIssues(
      dn.lineItems.map((l) => ({
        hsn: l.hsn,
        taxPct: l.taxPct,
        returnQty: l.returnQty,
      })),
    ),
  );

  const interstate = inferInterstateFromPlaceOfSupply(
    placeOfSupply,
    resolveCustomerState(customerId),
  );
  const computed = computeNoteTaxBreakup(dn.lineItems, interstate);
  if (Math.abs(computed.taxableValue - dn.taxableAmount) > 0.05) {
    issues.push({
      code: "tax_amount_mismatch",
      message: "Taxable value does not match line totals",
    });
  }

  const tax = debitNoteTaxFromRecord(dn);
  if (Math.abs(tax.taxAmount - dn.gstAmount) > 0.05) {
    issues.push({ code: "tax_amount_mismatch", message: "GST amount does not match component split" });
  }

  const splitIssue = detectTaxSplitIssue(
    interstate,
    dn.cgstAmount,
    dn.sgstAmount,
    dn.igstAmount,
    tax.taxAmount,
  );
  if (splitIssue) issues.push(splitIssue);

  return issues;
}

function buildDuplicateNumberSets(): {
  invoiceNos: Set<string>;
  creditNoteNos: Set<string>;
  debitNoteNos: Set<string>;
} {
  const invoiceCounts = new Map<string, number>();
  const cnCounts = new Map<string, number>();
  const dnCounts = new Map<string, number>();

  for (const inv of loadInvoices()) {
    const key = inv.invoiceNo?.trim().toLowerCase();
    if (!key) continue;
    invoiceCounts.set(key, (invoiceCounts.get(key) ?? 0) + 1);
  }
  for (const cn of loadCreditNotes()) {
    const key = cn.creditNoteNo?.trim().toLowerCase();
    if (!key) continue;
    cnCounts.set(key, (cnCounts.get(key) ?? 0) + 1);
  }
  for (const dn of loadDebitNotes()) {
    if (!isOutwardDebitNote(dn)) continue;
    const key = dn.debitNoteNo?.trim().toLowerCase();
    if (!key) continue;
    dnCounts.set(key, (dnCounts.get(key) ?? 0) + 1);
  }

  const invoiceNos = new Set<string>();
  const creditNoteNos = new Set<string>();
  const debitNoteNos = new Set<string>();
  for (const [k, c] of invoiceCounts) if (c > 1) invoiceNos.add(k);
  for (const [k, c] of cnCounts) if (c > 1) creditNoteNos.add(k);
  for (const [k, c] of dnCounts) if (c > 1) debitNoteNos.add(k);
  return { invoiceNos, creditNoteNos, debitNoteNos };
}

function resolveCreditNoteBranch(cn: CreditNoteRecord): string {
  return (cn as { branch?: string }).branch?.trim() || "";
}

function invoiceToTransaction(
  inv: InvoiceRecord,
  duplicateNos: Set<string>,
): GstOutwardTransaction {
  const breakup = getInvoiceGstBreakup(inv);
  const section = classifyInvoiceSection(inv);
  return {
    id: `inv-${inv.id}`,
    docType: "sales_invoice",
    sourceId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate.slice(0, 10),
    partyName: inv.customerName || "—",
    gstin: resolveCustomerGstin(inv.customerId, inv.customerGst) || "—",
    section,
    taxableValue: breakup.taxableValue,
    cgst: breakup.cgst,
    sgst: breakup.sgst,
    igst: breakup.igst,
    cess: 0,
    taxAmount: round2(breakup.cgst + breakup.sgst + breakup.igst),
    branch: inv.branch?.trim() || "",
    warehouse: inv.warehouse?.trim() || "",
    exceptions: detectSalesInvoiceExceptions(inv, duplicateNos),
  };
}

function creditNoteToTransaction(
  cn: CreditNoteRecord,
  duplicateNos: Set<string>,
): GstOutwardTransaction {
  const tax = creditNoteTaxFromRecord(cn);
  const gstin = resolveCustomerGstin(cn.customerId);
  const registered = isCustomerGstRegistered(cn.customerId, gstin);
  const section: Gstr1SectionId = isNilRatedOrExemptCreditNote(cn)
    ? "nil-rated-exempt"
    : registered
      ? "credit-notes-registered"
      : "credit-notes-unregistered";

  return {
    id: `cn-${cn.id}`,
    docType: "credit_note",
    sourceId: cn.id,
    documentNo: cn.creditNoteNo,
    documentDate: cn.creditNoteDate.slice(0, 10),
    partyName: cn.customerName || "—",
    gstin: gstin || "—",
    section,
    taxableValue: tax.taxableValue,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    cess: 0,
    taxAmount: tax.taxAmount,
    branch: resolveCreditNoteBranch(cn),
    warehouse: "",
    exceptions: detectCreditNoteExceptions(cn, duplicateNos),
  };
}

function debitNoteToTransaction(
  dn: DebitNoteRecord,
  duplicateNos: Set<string>,
): GstOutwardTransaction {
  const tax = debitNoteTaxFromRecord(dn);
  const customerId = (dn as { customerId?: number | null }).customerId ?? null;
  const gstin = resolveCustomerGstin(customerId, (dn as { customerGstin?: string }).customerGstin);
  const registered = isCustomerGstRegistered(customerId, gstin);
  const section: Gstr1SectionId = registered
    ? "debit-notes-registered"
    : "debit-notes-unregistered";

  return {
    id: `dn-${dn.id}`,
    docType: "debit_note",
    sourceId: dn.id,
    documentNo: dn.debitNoteNo,
    documentDate: dn.debitNoteDate.slice(0, 10),
    partyName: dn.vendorName || "—",
    gstin: gstin || "—",
    section,
    taxableValue: tax.taxableValue,
    cgst: tax.cgst,
    sgst: tax.sgst,
    igst: tax.igst,
    cess: 0,
    taxAmount: tax.taxAmount,
    branch: (dn as { branch?: string }).branch?.trim() || "",
    warehouse: "",
    exceptions: detectDebitNoteExceptions(dn, duplicateNos),
  };
}

function aggregateSection(
  sectionId: Gstr1SectionId,
  txs: GstOutwardTransaction[],
): Gstr1SectionRow {
  const sectionTxs = txs.filter((t) => t.section === sectionId);
  return {
    sectionId,
    section: GSTR1_SECTION_LABELS[sectionId],
    documentCount: sectionTxs.length,
    taxableValue: round2(sectionTxs.reduce((s, t) => s + t.taxableValue, 0)),
    taxAmount: round2(sectionTxs.reduce((s, t) => s + t.taxAmount, 0)),
    exceptions: sectionTxs.filter((t) => t.exceptions.length > 0).length,
  };
}

function buildHsnSectionRow(txs: GstOutwardTransaction[]): Gstr1SectionRow {
  const hsnCodes = new Set<string>();
  for (const tx of txs) {
    if (tx.docType === "sales_invoice") {
      const inv = loadInvoices().find((i) => i.id === tx.sourceId);
      inv?.lineItems.forEach((l) => {
        if (l.hsn?.trim()) hsnCodes.add(l.hsn.trim());
      });
    }
    if (tx.docType === "credit_note") {
      const cn = loadCreditNotes().find((c) => c.id === tx.sourceId);
      cn?.lineItems.forEach((l) => {
        if (l.hsn?.trim()) hsnCodes.add(l.hsn.trim());
      });
    }
  }
  return {
    sectionId: "hsn-summary",
    section: GSTR1_SECTION_LABELS["hsn-summary"],
    documentCount: hsnCodes.size,
    taxableValue: round2(txs.reduce((s, t) => s + t.taxableValue, 0)),
    taxAmount: round2(txs.reduce((s, t) => s + t.taxAmount, 0)),
    exceptions: txs.filter((t) => t.exceptions.some((e) => e.code === "missing_hsn")).length,
  };
}

function buildDocumentsSectionRow(txs: GstOutwardTransaction[]): Gstr1SectionRow {
  return {
    sectionId: "documents-summary",
    section: GSTR1_SECTION_LABELS["documents-summary"],
    documentCount: txs.length,
    taxableValue: round2(txs.reduce((s, t) => s + t.taxableValue, 0)),
    taxAmount: round2(txs.reduce((s, t) => s + t.taxAmount, 0)),
    exceptions: txs.filter((t) => t.exceptions.length > 0).length,
  };
}

function buildTaxSectionRow(txs: GstOutwardTransaction[]): Gstr1SectionRow {
  const rateBuckets = new Set<number>();
  for (const tx of txs) {
    if (tx.docType === "sales_invoice") {
      const inv = loadInvoices().find((i) => i.id === tx.sourceId);
      inv?.lineItems.forEach((l) => {
        if (l.taxPct > 0) rateBuckets.add(l.taxPct);
      });
    }
    if (tx.docType === "credit_note") {
      const cn = loadCreditNotes().find((c) => c.id === tx.sourceId);
      cn?.lineItems.forEach((l) => {
        if ((l.taxPct ?? 0) > 0) rateBuckets.add(l.taxPct ?? 0);
      });
    }
  }
  return {
    sectionId: "tax-summary",
    section: GSTR1_SECTION_LABELS["tax-summary"],
    documentCount: rateBuckets.size,
    taxableValue: round2(txs.reduce((s, t) => s + t.taxableValue, 0)),
    taxAmount: round2(txs.reduce((s, t) => s + t.taxAmount, 0)),
    exceptions: txs.filter((t) =>
      t.exceptions.some((e) => e.code === "missing_gst_rate" || e.code === "tax_amount_mismatch"),
    ).length,
  };
}

function buildExceptionsSectionRow(txs: GstOutwardTransaction[]): Gstr1SectionRow {
  const withExceptions = txs.filter((t) => t.exceptions.length > 0);
  return {
    sectionId: "exceptions",
    section: GSTR1_SECTION_LABELS.exceptions,
    documentCount: withExceptions.length,
    taxableValue: round2(withExceptions.reduce((s, t) => s + t.taxableValue, 0)),
    taxAmount: round2(withExceptions.reduce((s, t) => s + t.taxAmount, 0)),
    exceptions: withExceptions.length,
  };
}

function buildSummaryCards(txs: GstOutwardTransaction[]): GstSummaryCards {
  const invoices = txs.filter((t) => t.docType === "sales_invoice");
  const creditNotes = txs.filter((t) => t.docType === "credit_note");
  const debitNotes = txs.filter((t) => t.docType === "debit_note");
  const nilTxs = txs.filter((t) => t.section === "nil-rated-exempt");

  const netTaxable = round2(
    invoices.reduce((s, t) => s + t.taxableValue, 0) -
      creditNotes.reduce((s, t) => s + t.taxableValue, 0) +
      debitNotes.reduce((s, t) => s + t.taxableValue, 0),
  );

  return {
    totalSalesInvoices: invoices.length,
    totalTaxableValue: netTaxable,
    totalCgst: round2(
      invoices.reduce((s, t) => s + t.cgst, 0) -
        creditNotes.reduce((s, t) => s + t.cgst, 0) +
        debitNotes.reduce((s, t) => s + t.cgst, 0),
    ),
    totalSgst: round2(
      invoices.reduce((s, t) => s + t.sgst, 0) -
        creditNotes.reduce((s, t) => s + t.sgst, 0) +
        debitNotes.reduce((s, t) => s + t.sgst, 0),
    ),
    totalIgst: round2(
      invoices.reduce((s, t) => s + t.igst, 0) -
        creditNotes.reduce((s, t) => s + t.igst, 0) +
        debitNotes.reduce((s, t) => s + t.igst, 0),
    ),
    totalCess: round2(txs.reduce((s, t) => s + t.cess, 0)),
    totalCreditNotes: creditNotes.length,
    totalDebitNotes: debitNotes.length,
    totalNilRatedExemptValue: round2(nilTxs.reduce((s, t) => s + t.taxableValue, 0)),
    totalExceptions: txs.filter((t) => t.exceptions.length > 0).length,
  };
}

export function collectGstOutwardTransactions(
  filters: GstDashboardFilters,
): GstOutwardTransaction[] {
  const { invoiceNos, creditNoteNos, debitNoteNos } = buildDuplicateNumberSets();
  const txs: GstOutwardTransaction[] = [];

  for (const inv of loadInvoices()) {
    if (!isQualifyingSalesInvoice(inv)) continue;
    const tx = invoiceToTransaction(inv, invoiceNos);
    if (!documentMatchesFilters(tx.documentDate, tx.branch, tx.warehouse, filters)) continue;
    txs.push(tx);
  }

  for (const cn of loadCreditNotes()) {
    if (!isQualifyingCreditNote(cn)) continue;
    const tx = creditNoteToTransaction(cn, creditNoteNos);
    if (!documentMatchesFilters(tx.documentDate, tx.branch, tx.warehouse, filters)) continue;
    txs.push(tx);
  }

  for (const dn of loadDebitNotes()) {
    if (!isQualifyingDebitNote(dn)) continue;
    const tx = debitNoteToTransaction(dn, debitNoteNos);
    if (!documentMatchesFilters(tx.documentDate, tx.branch, tx.warehouse, filters)) continue;
    txs.push(tx);
  }

  return txs.sort(
    (a, b) => b.documentDate.localeCompare(a.documentDate) || a.documentNo.localeCompare(b.documentNo),
  );
}

export function computeGstDashboard(filters: GstDashboardFilters): GstDashboardResult {
  const transactions = collectGstOutwardTransactions(filters);

  const primarySections: Gstr1SectionId[] = [
    "b2b",
    "b2c",
    "exports",
    "credit-notes-registered",
    "credit-notes-unregistered",
    "debit-notes-registered",
    "debit-notes-unregistered",
    "nil-rated-exempt",
  ];

  const sections: Gstr1SectionRow[] = [
    ...primarySections.map((id) => aggregateSection(id, transactions)),
    buildHsnSectionRow(transactions),
    buildDocumentsSectionRow(transactions),
    buildTaxSectionRow(transactions),
    buildExceptionsSectionRow(transactions),
  ];

  return {
    cards: buildSummaryCards(transactions),
    sections,
    transactions,
    hasData: transactions.length > 0,
  };
}

export function filterGstTransactionsBySection(
  transactions: GstOutwardTransaction[],
  sectionId: Gstr1SectionId,
): GstOutwardTransaction[] {
  if (sectionId === "exceptions") {
    return transactions.filter((t) => t.exceptions.length > 0);
  }
  if (sectionId === "hsn-summary" || sectionId === "documents-summary" || sectionId === "tax-summary") {
    return transactions;
  }
  return transactions.filter((t) => t.section === sectionId);
}

export function buildGstDashboardFilterQuery(filters: GstDashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  return params.toString();
}

export function parseGstDashboardFiltersFromSearch(
  search: string,
  defaults: GstDashboardFilters,
): GstDashboardFilters {
  const params = new URLSearchParams(search);
  const branchParam = params.get("branch");
  const warehouseParam = params.get("warehouse");
  return {
    financialYearId: params.get("fy") ?? defaults.financialYearId,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    branch: branchParam != null ? parseMultiFilterParam(branchParam) : defaults.branch,
    warehouse: warehouseParam != null ? parseMultiFilterParam(warehouseParam) : defaults.warehouse,
  };
}

export function buildGstr1SectionHref(
  sectionId: Gstr1SectionId,
  filters: GstDashboardFilters,
): string {
  const qs = buildGstDashboardFilterQuery(filters);
  const cnDnSections = new Set<Gstr1SectionId>([
    "credit-notes-registered",
    "credit-notes-unregistered",
    "debit-notes-registered",
    "debit-notes-unregistered",
  ]);
  if (cnDnSections.has(sectionId)) {
    const params = new URLSearchParams(qs);
    params.set("subsection", sectionId);
    const query = params.toString();
    return `/accounts/reports/gst-summary/gstr1/credit-debit-notes${query ? `?${query}` : ""}`;
  }
  if (sectionId === "nil-rated-exempt") {
    return `/accounts/reports/gst-summary/gstr1/nil-rated-exempt${qs ? `?${qs}` : ""}`;
  }
  if (sectionId === "b2b") {
    return `/accounts/reports/gst-summary/gstr1/b2b${qs ? `?${qs}` : ""}`;
  }
  if (sectionId === "b2c") {
    return `/accounts/reports/gst-summary/gstr1/b2c${qs ? `?${qs}` : ""}`;
  }
  if (sectionId === "hsn-summary") {
    return `/accounts/reports/gst-summary/gstr1/hsn-summary${qs ? `?${qs}` : ""}`;
  }
  if (sectionId === "documents-summary") {
    return `/accounts/reports/gst-summary/gstr1/documents-summary${qs ? `?${qs}` : ""}`;
  }
  return `/accounts/reports/gst-summary/gstr1/${sectionId}${qs ? `?${qs}` : ""}`;
}

export {
  getTrialBalanceBranchOptions as getGstDashboardBranchOptions,
  getTrialBalanceWarehouseOptions as getGstDashboardWarehouseOptions,
  resolveFinancialYearLabel,
};
