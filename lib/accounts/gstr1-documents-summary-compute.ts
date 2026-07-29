/**
 * GSTR-1 Documents Summary — counts and number ranges by document type.
 */

import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  loadInvoices,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import {
  getGstDashboardBranchOptions,
  getGstDashboardWarehouseOptions,
  type GstDashboardFilters,
} from "@/lib/accounts/gst-summary-compute";
import { resolveInvoiceDocumentType } from "@/lib/accounts/invoice-type";
import {
  appendMultiFilterParam,
  matchesMultiFilter,
  parseMultiFilterParam,
} from "@/lib/accounts/report-multi-filter-utils";

export type GstDocumentType = "sales_invoice" | "credit_note" | "debit_note";
export type GstDocumentTypeFilter = "all" | GstDocumentType;
export type DocumentsSummaryStatusFilter = "all" | "valid" | "exception";

export interface DocumentsSummaryFilters extends GstDashboardFilters {
  documentType: GstDocumentTypeFilter;
}

export interface GstDocumentEntry {
  docType: GstDocumentType;
  docId: number;
  documentNo: string;
  documentDate: string;
  cancelled: boolean;
  branch: string;
  warehouse: string;
}

export interface DocumentsSummaryRow {
  rowKey: GstDocumentType;
  documentType: GstDocumentType;
  documentTypeLabel: string;
  firstDocumentNo: string;
  lastDocumentNo: string;
  totalGenerated: number;
  cancelledCount: number;
  activeCount: number;
  listingHref: string;
}

export interface DocumentsSummaryTotals {
  totalSalesInvoices: number;
  totalCreditNotes: number;
  totalDebitNotes: number;
  totalDocumentsGenerated: number;
  totalCancelledDocuments: number;
}

export interface DocumentsSummaryReport {
  rows: DocumentsSummaryRow[];
  totals: DocumentsSummaryTotals;
  hasData: boolean;
}

const DOCUMENT_TYPE_LABELS: Record<GstDocumentType, string> = {
  sales_invoice: "Sales Invoice",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

const POSTED_CN_STATUSES = new Set(["posted", "approved", "processed", "cancelled"]);
const POSTED_DN_STATUSES = new Set(["posted", "approved", "processed", "cancelled"]);

function compareDocNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function matchesDateAndLocation(
  docDate: string,
  branch: string,
  warehouse: string,
  filters: DocumentsSummaryFilters,
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

function isPostedSalesInvoice(inv: InvoiceRecord): boolean {
  if (resolveInvoiceDocumentType(inv) === "stock_transfer") return false;
  if (inv.invoiceStatus === "cancelled") return true;
  if (inv.invoiceStatus === "draft") {
    return inv.workflow?.status === "posted";
  }
  const ws = inv.workflow?.status;
  if (ws && ["draft", "rejected", "sent_back"].includes(ws)) return false;
  return inv.invoiceStatus === "sent" || inv.workflow?.status === "posted";
}

function isPostedCreditNote(cn: CreditNoteRecord): boolean {
  return POSTED_CN_STATUSES.has(cn.status);
}

function isPostedDebitNote(dn: DebitNoteRecord): boolean {
  return POSTED_DN_STATUSES.has(dn.status);
}

function invoiceToEntry(inv: InvoiceRecord): GstDocumentEntry | null {
  if (!isPostedSalesInvoice(inv)) return null;
  return {
    docType: "sales_invoice",
    docId: inv.id,
    documentNo: inv.invoiceNo,
    documentDate: inv.invoiceDate.slice(0, 10),
    cancelled: inv.invoiceStatus === "cancelled",
    branch: inv.branch?.trim() || "—",
    warehouse: inv.warehouse?.trim() || "—",
  };
}

function creditNoteToEntry(cn: CreditNoteRecord): GstDocumentEntry | null {
  if (!isPostedCreditNote(cn)) return null;
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
    documentNo: cn.creditNoteNo,
    documentDate: cn.creditNoteDate.slice(0, 10),
    cancelled: cn.status === "cancelled",
    branch,
    warehouse,
  };
}

function debitNoteToEntry(dn: DebitNoteRecord): GstDocumentEntry | null {
  if (!isPostedDebitNote(dn)) return null;
  return {
    docType: "debit_note",
    docId: dn.id,
    documentNo: dn.debitNoteNo,
    documentDate: dn.debitNoteDate.slice(0, 10),
    cancelled: dn.status === "cancelled",
    branch: (dn as { branch?: string }).branch?.trim() || "—",
    warehouse: "—",
  };
}

function collectDocumentEntries(filters: DocumentsSummaryFilters): GstDocumentEntry[] {
  const entries: GstDocumentEntry[] = [];

  for (const inv of loadInvoices()) {
    const entry = invoiceToEntry(inv);
    if (!entry) continue;
    if (!matchesDateAndLocation(entry.documentDate, entry.branch, entry.warehouse, filters)) continue;
    if (filters.documentType !== "all" && filters.documentType !== "sales_invoice") continue;
    entries.push(entry);
  }

  for (const cn of loadCreditNotes()) {
    const entry = creditNoteToEntry(cn);
    if (!entry) continue;
    if (!matchesDateAndLocation(entry.documentDate, entry.branch, entry.warehouse, filters)) continue;
    if (filters.documentType !== "all" && filters.documentType !== "credit_note") continue;
    entries.push(entry);
  }

  for (const dn of loadDebitNotes()) {
    const entry = debitNoteToEntry(dn);
    if (!entry) continue;
    if (!matchesDateAndLocation(entry.documentDate, entry.branch, entry.warehouse, filters)) continue;
    if (filters.documentType !== "all" && filters.documentType !== "debit_note") continue;
    entries.push(entry);
  }

  return entries;
}

export function buildDocumentsListingHref(
  docType: GstDocumentType,
  filters: DocumentsSummaryFilters,
): string {
  const paths: Record<GstDocumentType, string> = {
    sales_invoice: "/accounts/transactions/invoices",
    credit_note: "/accounts/transactions/credit-notes",
    debit_note: "/accounts/transactions/debit-notes",
  };
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  const qs = params.toString();
  return `${paths[docType]}${qs ? `?${qs}` : ""}`;
}

function buildRowForType(
  docType: GstDocumentType,
  entries: GstDocumentEntry[],
  filters: DocumentsSummaryFilters,
): DocumentsSummaryRow | null {
  const typeEntries = entries.filter((e) => e.docType === docType);
  if (typeEntries.length === 0) return null;

  const sorted = [...typeEntries].sort(
    (a, b) =>
      a.documentDate.localeCompare(b.documentDate) ||
      compareDocNumbers(a.documentNo, b.documentNo),
  );

  const cancelledCount = typeEntries.filter((e) => e.cancelled).length;
  const totalGenerated = typeEntries.length;

  return {
    rowKey: docType,
    documentType: docType,
    documentTypeLabel: DOCUMENT_TYPE_LABELS[docType],
    firstDocumentNo: sorted[0]?.documentNo || "—",
    lastDocumentNo: sorted[sorted.length - 1]?.documentNo || "—",
    totalGenerated,
    cancelledCount,
    activeCount: totalGenerated - cancelledCount,
    listingHref: buildDocumentsListingHref(docType, filters),
  };
}

function buildTotals(rows: DocumentsSummaryRow[]): DocumentsSummaryTotals {
  const byType = (t: GstDocumentType) => rows.find((r) => r.documentType === t)?.totalGenerated ?? 0;
  const totalGenerated = rows.reduce((s, r) => s + r.totalGenerated, 0);
  const totalCancelled = rows.reduce((s, r) => s + r.cancelledCount, 0);
  return {
    totalSalesInvoices: byType("sales_invoice"),
    totalCreditNotes: byType("credit_note"),
    totalDebitNotes: byType("debit_note"),
    totalDocumentsGenerated: totalGenerated,
    totalCancelledDocuments: totalCancelled,
  };
}

const ROW_ORDER: GstDocumentType[] = ["sales_invoice", "credit_note", "debit_note"];

export function buildDocumentsSummaryReport(filters: DocumentsSummaryFilters): DocumentsSummaryReport {
  const entries = collectDocumentEntries(filters);
  const typesToShow: GstDocumentType[] =
    filters.documentType === "all" ? ROW_ORDER : [filters.documentType];

  const rows: DocumentsSummaryRow[] = [];
  for (const docType of typesToShow) {
    const row = buildRowForType(docType, entries, filters);
    if (row) rows.push(row);
  }

  return {
    rows,
    totals: buildTotals(rows),
    hasData: rows.length > 0,
  };
}

export function parseDocumentsSummaryFiltersFromSearch(
  search: string,
  defaults: DocumentsSummaryFilters,
): DocumentsSummaryFilters {
  const params = new URLSearchParams(search);
  const docType = params.get("documentType") as GstDocumentTypeFilter | null;
  const validTypes: GstDocumentTypeFilter[] = [
    "all",
    "sales_invoice",
    "credit_note",
    "debit_note",
  ];

  const branchParam = params.get("branch");
  const warehouseParam = params.get("warehouse");

  return {
    financialYearId: params.get("fy") ?? defaults.financialYearId,
    dateFrom: params.get("from") ?? defaults.dateFrom,
    dateTo: params.get("to") ?? defaults.dateTo,
    branch: branchParam != null ? parseMultiFilterParam(branchParam) : defaults.branch,
    warehouse: warehouseParam != null ? parseMultiFilterParam(warehouseParam) : defaults.warehouse,
    documentType: docType && validTypes.includes(docType) ? docType : defaults.documentType,
  };
}

export function buildDocumentsSummaryFilterQuery(filters: DocumentsSummaryFilters): string {
  const params = new URLSearchParams();
  if (filters.financialYearId !== "all") params.set("fy", filters.financialYearId);
  params.set("from", filters.dateFrom);
  params.set("to", filters.dateTo);
  appendMultiFilterParam(params, "branch", filters.branch);
  appendMultiFilterParam(params, "warehouse", filters.warehouse);
  if (filters.documentType !== "all") params.set("documentType", filters.documentType);
  return params.toString();
}

export {
  getGstDashboardBranchOptions as getDocumentsSummaryBranchOptions,
  getGstDashboardWarehouseOptions as getDocumentsSummaryWarehouseOptions,
  DOCUMENT_TYPE_LABELS,
};
