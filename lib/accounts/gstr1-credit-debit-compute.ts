/**
 * GSTR-1 Credit / Debit Notes report — outward CN & DN by customer registration.
 */

import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { inferInterstateFromPlaceOfSupply } from "@/lib/accounts/gst-accounting";
import {
  detectCreditNoteExceptions,
  detectDebitNoteExceptions,
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  GSTR1_SECTION_LABELS,
  isCustomerGstRegistered,
  isOutwardDebitNote,
  isQualifyingCreditNote,
  isQualifyingDebitNote,
  resolveCustomerGstin,
  resolveCustomerState,
  type GstDashboardFilters,
  type GstExceptionCode,
  type GstExceptionIssue,
  type Gstr1SectionId,
} from "@/lib/accounts/gst-summary-compute";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  matchesPrefixedIdFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";

export type GstNoteSubsection =
  | "credit-notes-registered"
  | "credit-notes-unregistered"
  | "debit-notes-registered"
  | "debit-notes-unregistered";

export type GstNoteTypeFilter = "all" | "credit" | "debit";
export type GstNoteStatusFilter = "all" | "valid" | "exception";

export interface GstCreditDebitFilters extends GstDashboardFilters {
  customerId: string | string[];
  noteType: GstNoteTypeFilter;
  status: GstNoteStatusFilter;
  noteNo: string;
  subsection: GstNoteSubsection | "all";
}

export interface GstNoteRateBreakup {
  ratePct: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalTax: number;
}

export interface GstNoteLineDetail {
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

export type GstNoteRowStatus = "valid" | "exception";
export type GstNoteDocType = "credit_note" | "debit_note";

export interface GstCreditDebitNoteRow {
  rowKey: string;
  docType: GstNoteDocType;
  sourceId: number;
  subsection: GstNoteSubsection;
  noteDate: string;
  noteNumber: string;
  originalInvoiceNo: string;
  originalInvoiceDate: string;
  originalInvoiceId: number | null;
  customerId: number | null;
  customerName: string;
  gstin: string;
  registrationType: "Registered" | "Unregistered";
  taxableValue: number;
  gstRateLabel: string;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  totalAmount: number;
  reason: string;
  status: GstNoteRowStatus;
  exceptions: GstExceptionIssue[];
  rateBreakups: GstNoteRateBreakup[];
  lineDetails: GstNoteLineDetail[];
  branch: string;
  warehouse: string;
  voucherNo: string;
  voucherId: number | null;
  hasMultipleRates: boolean;
}

export interface GstCreditDebitSummaryTotals {
  totalCreditNotes: number;
  totalDebitNotes: number;
  totalTaxableValue: number;
  totalGst: number;
  totalExceptions: number;
}

export interface GstCreditDebitReport {
  rows: GstCreditDebitNoteRow[];
  totals: GstCreditDebitSummaryTotals;
  hasData: boolean;
}

const SUBSECTION_ORDER: GstNoteSubsection[] = [
  "credit-notes-registered",
  "credit-notes-unregistered",
  "debit-notes-registered",
  "debit-notes-unregistered",
];

function round2(n: number): number {
  return roundMoney(n);
}

function isNilRatedOrExemptCreditNote(cn: CreditNoteRecord): boolean {
  const activeLines = cn.lineItems.filter(
    (l) => (l.returnQty ?? 0) > 0 || (l.creditAmount ?? 0) > 0,
  );
  if (activeLines.length === 0) return cn.taxCreditAmount <= 0;
  return activeLines.every((l) => (l.taxPct ?? 0) <= 0);
}

function buildDuplicateCreditNoteNumbers(): Set<string> {
  const counts = new Map<string, number>();
  for (const cn of loadCreditNotes()) {
    const key = cn.creditNoteNo?.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [k, c] of counts) if (c > 1) dupes.add(k);
  return dupes;
}

function buildDuplicateDebitNoteNumbers(): Set<string> {
  const counts = new Map<string, number>();
  for (const dn of loadDebitNotes()) {
    if (!isOutwardDebitNote(dn)) continue;
    const key = dn.debitNoteNo?.trim().toLowerCase();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const dupes = new Set<string>();
  for (const [k, c] of counts) if (c > 1) dupes.add(k);
  return dupes;
}

function resolveOriginalInvoice(
  sourceInvoiceId: number | null,
  sourceInvoiceNo: string,
  linkedInvoiceId?: number | null,
  linkedInvoiceNo?: string,
): { no: string; date: string; id: number | null } {
  const invId = sourceInvoiceId ?? linkedInvoiceId ?? null;
  const invNo = sourceInvoiceNo?.trim() || linkedInvoiceNo?.trim() || "";
  const invoices = loadInvoices();
  let inv = invId != null ? invoices.find((i) => i.id === invId) : undefined;
  if (!inv && invNo) inv = invoices.find((i) => i.invoiceNo === invNo);
  return {
    no: inv?.invoiceNo || invNo || "—",
    date: inv?.invoiceDate?.slice(0, 10) || "—",
    id: inv?.id ?? invId,
  };
}

function resolveNoteBranchWarehouse(
  branch: string,
  sourceInvoiceId: number | null,
): { branch: string; warehouse: string } {
  const inv =
    sourceInvoiceId != null
      ? loadInvoices().find((i) => i.id === sourceInvoiceId)
      : undefined;
  return {
    branch: branch?.trim() || inv?.branch?.trim() || "—",
    warehouse: inv?.warehouse?.trim() || "—",
  };
}

function resolveLinkedVoucher(noteNumber: string): { voucherNo: string; voucherId: number | null } {
  const q = noteNumber.trim().toLowerCase();
  if (!q) return { voucherNo: "—", voucherId: null };
  const match = loadVouchers().find(
    (v) =>
      (v.status === "posted" || v.status === "approved") &&
      (v.referenceNo?.trim().toLowerCase() === q ||
        v.narration?.toLowerCase().includes(q)),
  );
  return {
    voucherNo: match?.voucherNumber?.trim() || "—",
    voucherId: match?.id ?? null,
  };
}

function buildRateBreakups(
  lines: Array<{ creditAmount?: number; debitAmount?: number; taxPct?: number }>,
  interstate: boolean,
): GstNoteRateBreakup[] {
  const buckets = new Map<
    number,
    { taxable: number; cgst: number; sgst: number; igst: number }
  >();

  for (const line of lines) {
    const amount = line.creditAmount ?? line.debitAmount ?? 0;
    if (amount <= 0) continue;
    const rate = line.taxPct ?? 0;
    const taxRate = 1 + rate / 100;
    const taxable = round2(amount / taxRate);
    const tax = round2(amount - taxable);
    const existing = buckets.get(rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    if (interstate) {
      buckets.set(rate, {
        taxable: round2(existing.taxable + taxable),
        cgst: existing.cgst,
        sgst: existing.sgst,
        igst: round2(existing.igst + tax),
      });
    } else {
      const half = round2(tax / 2);
      buckets.set(rate, {
        taxable: round2(existing.taxable + taxable),
        cgst: round2(existing.cgst + half),
        sgst: round2(existing.sgst + round2(tax - half)),
        igst: existing.igst,
      });
    }
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

function buildLineDetails(
  lines: Array<{
    id: string;
    productName: string;
    productId?: number | null;
    hsn?: string;
    returnQty: number;
    creditAmount?: number;
    debitAmount?: number;
    taxPct: number;
  }>,
  interstate: boolean,
): GstNoteLineDetail[] {
  return lines
    .filter((l) => l.returnQty > 0 || (l.creditAmount ?? l.debitAmount ?? 0) > 0)
    .map((line) => {
      const amount = line.creditAmount ?? line.debitAmount ?? 0;
      const rate = line.taxPct ?? 0;
      const taxRate = 1 + rate / 100;
      const taxable = round2(amount / taxRate);
      const tax = round2(amount - taxable);
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      if (interstate) {
        igst = tax;
      } else {
        const half = round2(tax / 2);
        cgst = half;
        sgst = round2(tax - half);
      }
      return {
        id: line.id,
        productName: line.productName || "—",
        productId: line.productId ?? null,
        hsn: line.hsn?.trim() || "—",
        qty: line.returnQty,
        unit: "—",
        taxableValue: taxable,
        taxPct: rate,
        cgst,
        sgst,
        igst,
        cess: 0,
        lineTotal: amount,
      };
    });
}

function formatGstRateLabel(breakups: GstNoteRateBreakup[]): string {
  const taxed = breakups.filter((b) => b.ratePct > 0);
  if (taxed.length === 0) return "0%";
  if (taxed.length === 1) return `${taxed[0].ratePct}%`;
  return "Multi";
}

function classifyCreditNoteSubsection(cn: CreditNoteRecord): GstNoteSubsection | null {
  if (isNilRatedOrExemptCreditNote(cn)) return null;
  const gstin = resolveCustomerGstin(cn.customerId);
  const registered = isCustomerGstRegistered(cn.customerId, gstin);
  return registered ? "credit-notes-registered" : "credit-notes-unregistered";
}

function classifyDebitNoteSubsection(dn: DebitNoteRecord): GstNoteSubsection | null {
  if (!isOutwardDebitNote(dn)) return null;
  const customerId = (dn as { customerId?: number | null }).customerId ?? null;
  const gstin = resolveCustomerGstin(
    customerId,
    (dn as { customerGstin?: string }).customerGstin,
  );
  const registered = isCustomerGstRegistered(customerId, gstin);
  return registered ? "debit-notes-registered" : "debit-notes-unregistered";
}

function matchesBaseFilters(
  noteDate: string,
  branch: string,
  warehouse: string,
  filters: GstCreditDebitFilters,
): boolean {
  const date = noteDate.slice(0, 10);
  if (filters.financialYearId !== "all" && filters.financialYearId) {
    const fy = loadFinancialYears().find((f) => String(f.id) === filters.financialYearId);
    if (fy && (date < fy.startDate || date > fy.endDate)) return false;
  }
  if (date < filters.dateFrom || date > filters.dateTo) return false;
  if (!matchesMultiFilter(filters.branch, branch === "—" ? "" : branch)) return false;
  if (!matchesMultiFilter(filters.warehouse, warehouse === "—" ? "" : warehouse)) return false;
  return true;
}

function creditNoteToRow(cn: CreditNoteRecord, duplicateNos: Set<string>): GstCreditDebitNoteRow | null {
  const subsection = classifyCreditNoteSubsection(cn);
  if (!subsection) return null;

  const gstin = resolveCustomerGstin(cn.customerId);
  const registered = isCustomerGstRegistered(cn.customerId, gstin);
  const original = resolveOriginalInvoice(
    cn.sourceInvoiceId,
    cn.sourceInvoiceNo,
    cn.linkedInvoices?.[0]?.id,
    cn.linkedInvoices?.[0]?.invoiceNo,
  );
  const { branch, warehouse } = resolveNoteBranchWarehouse(
    (cn as { branch?: string }).branch ?? "",
    original.id,
  );
  const placeOfSupply = (cn as { placeOfSupply?: string }).placeOfSupply;
  const interstate = inferInterstateFromPlaceOfSupply(
    placeOfSupply,
    resolveCustomerState(cn.customerId),
  );
  const rateBreakups = buildRateBreakups(cn.lineItems, interstate);
  const exceptions = detectCreditNoteExceptions(cn, duplicateNos);
  const voucher = resolveLinkedVoucher(cn.creditNoteNo);
  const totalAmount = round2(cn.currentCreditAmount);

  return {
    rowKey: `cn-${cn.id}`,
    docType: "credit_note",
    sourceId: cn.id,
    subsection,
    noteDate: cn.creditNoteDate.slice(0, 10),
    noteNumber: cn.creditNoteNo,
    originalInvoiceNo: original.no,
    originalInvoiceDate: original.date,
    originalInvoiceId: original.id,
    customerId: cn.customerId,
    customerName: cn.customerName || "—",
    gstin: gstin || "—",
    registrationType: registered ? "Registered" : "Unregistered",
    taxableValue: cn.taxableValue,
    gstRateLabel: formatGstRateLabel(rateBreakups),
    cgst: cn.cgstAmount,
    sgst: cn.sgstAmount,
    igst: cn.igstAmount,
    cess: 0,
    totalAmount,
    reason: cn.reason?.trim() || "—",
    status: exceptions.length > 0 ? "exception" : "valid",
    exceptions,
    rateBreakups,
    lineDetails: buildLineDetails(cn.lineItems, interstate),
    branch,
    warehouse,
    voucherNo: voucher.voucherNo,
    voucherId: voucher.voucherId,
    hasMultipleRates: rateBreakups.filter((b) => b.ratePct > 0).length > 1,
  };
}

function debitNoteToRow(dn: DebitNoteRecord, duplicateNos: Set<string>): GstCreditDebitNoteRow | null {
  const subsection = classifyDebitNoteSubsection(dn);
  if (!subsection) return null;

  const customerId = (dn as { customerId?: number | null }).customerId ?? null;
  const customerName =
    (dn as { customerName?: string }).customerName?.trim() || dn.vendorName || "—";
  const gstin = resolveCustomerGstin(
    customerId,
    (dn as { customerGstin?: string }).customerGstin,
  );
  const registered = isCustomerGstRegistered(customerId, gstin);
  const original = resolveOriginalInvoice(dn.sourceInvoiceId, dn.sourceInvoiceNo);
  const { branch, warehouse } = resolveNoteBranchWarehouse(
    (dn as { branch?: string }).branch ?? "",
    original.id,
  );
  const placeOfSupply = (dn as { placeOfSupply?: string }).placeOfSupply;
  const interstate = inferInterstateFromPlaceOfSupply(
    placeOfSupply,
    resolveCustomerState(customerId),
  );
  const rateBreakups = buildRateBreakups(dn.lineItems, interstate);
  const exceptions = detectDebitNoteExceptions(dn, duplicateNos);
  const voucher = resolveLinkedVoucher(dn.debitNoteNo);
  const totalAmount = round2(dn.currentDebitAmount);

  return {
    rowKey: `dn-${dn.id}`,
    docType: "debit_note",
    sourceId: dn.id,
    subsection,
    noteDate: dn.debitNoteDate.slice(0, 10),
    noteNumber: dn.debitNoteNo,
    originalInvoiceNo: original.no,
    originalInvoiceDate: original.date,
    originalInvoiceId: original.id,
    customerId,
    customerName,
    gstin: gstin || "—",
    registrationType: registered ? "Registered" : "Unregistered",
    taxableValue: dn.taxableAmount,
    gstRateLabel: formatGstRateLabel(rateBreakups),
    cgst: dn.cgstAmount,
    sgst: dn.sgstAmount,
    igst: dn.igstAmount,
    cess: 0,
    totalAmount,
    reason: dn.reason?.trim() || "—",
    status: exceptions.length > 0 ? "exception" : "valid",
    exceptions,
    rateBreakups,
    lineDetails: buildLineDetails(dn.lineItems, interstate),
    branch,
    warehouse,
    voucherNo: voucher.voucherNo,
    voucherId: voucher.voucherId,
    hasMultipleRates: rateBreakups.filter((b) => b.ratePct > 0).length > 1,
  };
}

function matchesRowFilters(row: GstCreditDebitNoteRow, filters: GstCreditDebitFilters): boolean {
  if (filters.subsection !== "all" && row.subsection !== filters.subsection) return false;
  if (filters.noteType === "credit" && row.docType !== "credit_note") return false;
  if (filters.noteType === "debit" && row.docType !== "debit_note") return false;
  if (!matchesPrefixedIdFilter(filters.customerId, row.customerId, "customer:")) return false;
  const q = filters.noteNo.trim().toLowerCase();
  if (q && !row.noteNumber.toLowerCase().includes(q)) return false;
  if (filters.status === "valid" && row.status !== "valid") return false;
  if (filters.status === "exception" && row.status !== "exception") return false;
  return true;
}

function buildTotals(rows: GstCreditDebitNoteRow[]): GstCreditDebitSummaryTotals {
  const creditRows = rows.filter((r) => r.docType === "credit_note");
  const debitRows = rows.filter((r) => r.docType === "debit_note");
  const totalGst = round2(
    rows.reduce((s, r) => s + r.cgst + r.sgst + r.igst + r.cess, 0),
  );
  return {
    totalCreditNotes: creditRows.length,
    totalDebitNotes: debitRows.length,
    totalTaxableValue: round2(rows.reduce((s, r) => s + r.taxableValue, 0)),
    totalGst,
    totalExceptions: rows.filter((r) => r.status === "exception").length,
  };
}

export function buildGstCreditDebitReport(filters: GstCreditDebitFilters): GstCreditDebitReport {
  const cnDupes = buildDuplicateCreditNoteNumbers();
  const dnDupes = buildDuplicateDebitNoteNumbers();
  const rows: GstCreditDebitNoteRow[] = [];

  for (const cn of loadCreditNotes()) {
    if (!isQualifyingCreditNote(cn)) continue;
    const row = creditNoteToRow(cn, cnDupes);
    if (!row) continue;
    if (!matchesBaseFilters(row.noteDate, row.branch, row.warehouse, filters)) continue;
    if (!matchesRowFilters(row, filters)) continue;
    rows.push(row);
  }

  for (const dn of loadDebitNotes()) {
    if (!isQualifyingDebitNote(dn)) continue;
    const row = debitNoteToRow(dn, dnDupes);
    if (!row) continue;
    if (!matchesBaseFilters(row.noteDate, row.branch, row.warehouse, filters)) continue;
    if (!matchesRowFilters(row, filters)) continue;
    rows.push(row);
  }

  rows.sort((a, b) => {
    const subA = SUBSECTION_ORDER.indexOf(a.subsection);
    const subB = SUBSECTION_ORDER.indexOf(b.subsection);
    if (subA !== subB) return subA - subB;
    return b.noteDate.localeCompare(a.noteDate) || b.noteNumber.localeCompare(a.noteNumber);
  });

  return {
    rows,
    totals: buildTotals(rows),
    hasData: rows.length > 0,
  };
}

export function getGstNoteCustomerOptions(): { id: string; name: string }[] {
  const map = new Map<number, string>();
  const cnDupes = buildDuplicateCreditNoteNumbers();
  const dnDupes = buildDuplicateDebitNoteNumbers();

  for (const cn of loadCreditNotes()) {
    if (!isQualifyingCreditNote(cn)) continue;
    const row = creditNoteToRow(cn, cnDupes);
    if (row?.customerId != null && row.customerName) {
      map.set(row.customerId, row.customerName);
    }
  }
  for (const dn of loadDebitNotes()) {
    if (!isQualifyingDebitNote(dn)) continue;
    const row = debitNoteToRow(dn, dnDupes);
    if (row?.customerId != null && row.customerName) {
      map.set(row.customerId, row.customerName);
    }
  }

  return Array.from(map.entries())
    .map(([id, name]) => ({ id: `customer:${id}`, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getGstNoteByKey(rowKey: string): GstCreditDebitNoteRow | undefined {
  const cnDupes = buildDuplicateCreditNoteNumbers();
  const dnDupes = buildDuplicateDebitNoteNumbers();
  if (rowKey.startsWith("cn-")) {
    const id = Number(rowKey.slice(3));
    const cn = loadCreditNotes().find((c) => c.id === id);
    if (!cn || !isQualifyingCreditNote(cn)) return undefined;
    return creditNoteToRow(cn, cnDupes) ?? undefined;
  }
  if (rowKey.startsWith("dn-")) {
    const id = Number(rowKey.slice(3));
    const dn = loadDebitNotes().find((d) => d.id === id);
    if (!dn || !isQualifyingDebitNote(dn)) return undefined;
    return debitNoteToRow(dn, dnDupes) ?? undefined;
  }
  return undefined;
}

export interface ExceptionFixAction {
  label: string;
  href: string;
}

export function resolveGstNoteExceptionFixAction(
  code: GstExceptionCode,
  row: GstCreditDebitNoteRow,
): ExceptionFixAction | null {
  const editHref =
    row.docType === "credit_note"
      ? `/accounts/transactions/credit-notes/${row.sourceId}/edit`
      : `/accounts/transactions/debit-notes/${row.sourceId}/edit`;

  switch (code) {
    case "missing_gstin_registered":
    case "invalid_gstin":
    case "missing_customer_state":
      if (row.customerId != null) {
        return { label: "Fix Customer", href: `/masters/customers/${row.customerId}/edit` };
      }
      return { label: "Fix Note", href: editHref };
    case "missing_hsn":
    case "missing_gst_rate": {
      const line = row.lineDetails[0];
      if (line?.productId) {
        return { label: "Fix Product", href: `/masters/products/${line.productId}/edit` };
      }
      return { label: "Fix Note", href: editHref };
    }
    case "missing_original_invoice":
    case "missing_reason":
    case "missing_document_no":
    case "missing_document_date":
    case "duplicate_document_no":
    case "tax_amount_mismatch":
    case "incorrect_tax_split":
    case "missing_place_of_supply":
      return { label: "Fix Note", href: editHref };
    default:
      return { label: "Fix Note", href: editHref };
  }
}

export function subsectionLabel(subsection: GstNoteSubsection): string {
  return GSTR1_SECTION_LABELS[subsection as Gstr1SectionId];
}

export function parseGstCreditDebitFiltersFromSearch(
  search: string,
  defaults: GstCreditDebitFilters,
): GstCreditDebitFilters {
  const params = new URLSearchParams(search);
  const noteType = params.get("noteType") as GstNoteTypeFilter | null;
  const status = params.get("status") as GstNoteStatusFilter | null;
  const subsection = params.get("subsection") as GstCreditDebitFilters["subsection"] | null;
  const validNoteTypes: GstNoteTypeFilter[] = ["all", "credit", "debit"];
  const validStatus: GstNoteStatusFilter[] = ["all", "valid", "exception"];
  const validSubsections: GstCreditDebitFilters["subsection"][] = [
    "all",
    ...SUBSECTION_ORDER,
  ];

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
    noteType: noteType && validNoteTypes.includes(noteType) ? noteType : defaults.noteType,
    status: status && validStatus.includes(status) ? status : defaults.status,
    noteNo: params.get("noteNo") ?? defaults.noteNo,
    subsection:
      subsection && validSubsections.includes(subsection) ? subsection : defaults.subsection,
  };
}

export function buildGstCreditDebitFilterQuery(filters: GstCreditDebitFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  appendMultiFilterParam(params, "customer", filters.customerId);
  if (filters.noteType !== "all") params.set("noteType", filters.noteType);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.noteNo.trim()) params.set("noteNo", filters.noteNo.trim());
  if (filters.subsection !== "all") params.set("subsection", filters.subsection);
  return params.toString();
}

export {
  getGstDashboardBranchOptions as getGstNoteBranchOptions,
  getGstDashboardWarehouseOptions as getGstNoteWarehouseOptions,
};
