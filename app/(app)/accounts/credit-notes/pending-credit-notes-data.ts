/**
 * Pending credit notes — sales returns and scheme settlements awaiting CN generation.
 * Reads sales return + scheme data (read-only); does not modify non-Accounts modules.
 */

import {
  getSalesReturnRecords,
  getReturnTotalAmount,
  type SalesReturnRecord,
} from "@/app/(app)/sales/orders/sales-return-data";
import {
  buildReferenceFromSalesReturn,
  computeCreditNoteGstSplit,
  loadCreditNotes,
  recalcAllCreditLines,
} from "./credit-notes-data";
import {
  CREDIT_NOTE_SOURCE_KIND_LABELS,
  type CreditNoteSourceKind,
} from "./credit-note-source-types";
import {
  listAllSchemePendingSettlements,
  type UnifiedSchemePendingRow,
} from "./scheme-pending-settlements";
import {
  invalidateModuleDataCache,
  MODULE_CACHE_KEYS,
  readThroughModuleCache,
} from "@/lib/accounts/module-data-cache";

export type PendingCreditNoteSourceType = CreditNoteSourceKind;

export const PENDING_CREDIT_SOURCE_LABELS = CREDIT_NOTE_SOURCE_KIND_LABELS;

export interface PendingCreditNoteRow {
  /** Unique row key — return id or scheme settlement key */
  id: string;
  sourceType: PendingCreditNoteSourceType;
  customerName: string;
  customerId: number | null;
  referenceNo: string;
  linkedInvoiceNos: string[];
  linkedInvoiceIds: number[];
  eligibleCreditAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  status: "Pending";
  returnId?: string;
  returnDate?: string;
  schemeSettlementKey?: string;
  schemeName?: string;
}

function loadCreditNoteLinks(): Array<{
  sourceReturnId?: string;
  sourceReturnNo?: string;
  schemeSettlementKey?: string;
  status: string;
}> {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("ds_accounts_credit_notes_v2");
    return raw ? (JSON.parse(raw) as Array<{ sourceReturnId?: string; sourceReturnNo?: string; schemeSettlementKey?: string; status: string }>) : [];
  } catch {
    return [];
  }
}

export function hasCreditNoteForReturn(ret: SalesReturnRecord): boolean {
  if (ret.creditNoteId) return true;
  const notes = loadCreditNoteLinks();
  return notes.some(
    (cn) =>
      cn.status !== "cancelled" &&
      (cn.sourceReturnId === ret.id || cn.sourceReturnNo === ret.returnNumber),
  );
}

export function hasCreditNoteForScheme(key: string): boolean {
  const notes = loadCreditNoteLinks();
  return notes.some((cn) => cn.status !== "cancelled" && cn.schemeSettlementKey === key);
}

function splitGstFromTotal(total: number): {
  eligibleCreditAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
} {
  const gstRate = 0.18;
  const taxable = Math.round((total / (1 + gstRate)) * 100) / 100;
  const gst = Math.round((total - taxable) * 100) / 100;
  return {
    eligibleCreditAmount: taxable,
    gstAmount: gst,
    cgstAmount: Math.round((gst / 2) * 100) / 100,
    sgstAmount: Math.round((gst / 2) * 100) / 100,
    igstAmount: 0,
    totalAmount: total,
  };
}

function computeSalesReturnPendingAmounts(ret: SalesReturnRecord): {
  eligibleCreditAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  linkedInvoiceNos: string[];
  linkedInvoiceIds: number[];
} {
  const preview = buildReferenceFromSalesReturn(ret.id);
  if (preview) {
    const lines = preview.lineItems.map((l) => ({
      ...l,
      returnQty: l.eligibleReturnQty ?? l.salesReturnQty ?? 0,
    }));
    const recalced = recalcAllCreditLines(lines, preview.alreadyAdjustedAmount);
    const split = computeCreditNoteGstSplit(recalced);
    const gst = split.taxAmount;
    return {
      eligibleCreditAmount: split.taxable,
      gstAmount: gst,
      cgstAmount: Math.round((gst / 2) * 100) / 100,
      sgstAmount: Math.round((gst / 2) * 100) / 100,
      igstAmount: 0,
      totalAmount: split.grandTotal,
      linkedInvoiceNos: preview.sourceInvoiceNo ? [preview.sourceInvoiceNo] : [],
      linkedInvoiceIds: preview.sourceInvoiceId ? [preview.sourceInvoiceId] : [],
    };
  }

  const total = getReturnTotalAmount(ret);
  const split = splitGstFromTotal(total);
  const invoiceNos = ret.sourceInvoiceNo ? [ret.sourceInvoiceNo] : [];
  const invoiceIds = ret.sourceInvoiceId ? [ret.sourceInvoiceId] : [];

  return {
    ...split,
    linkedInvoiceNos: invoiceNos,
    linkedInvoiceIds: invoiceIds,
  };
}

function resolveSalesReturnCustomerId(ret: SalesReturnRecord): number | null {
  const preview = buildReferenceFromSalesReturn(ret.id);
  return preview?.customerId ?? null;
}

function salesReturnToPendingRow(ret: SalesReturnRecord): PendingCreditNoteRow {
  const amounts = computeSalesReturnPendingAmounts(ret);
  return {
    id: ret.id,
    sourceType: "sales_return",
    customerName: ret.customer,
    customerId: resolveSalesReturnCustomerId(ret),
    referenceNo: ret.returnNumber,
    linkedInvoiceNos: amounts.linkedInvoiceNos,
    linkedInvoiceIds: amounts.linkedInvoiceIds,
    eligibleCreditAmount: amounts.eligibleCreditAmount,
    gstAmount: amounts.gstAmount,
    cgstAmount: amounts.cgstAmount,
    sgstAmount: amounts.sgstAmount,
    igstAmount: amounts.igstAmount,
    totalAmount: amounts.totalAmount,
    status: "Pending",
    returnId: ret.id,
    returnDate: ret.returnDate,
  };
}

function schemeToPendingRow(row: UnifiedSchemePendingRow): PendingCreditNoteRow {
  const split = splitGstFromTotal(row.eligibleAmount);
  return {
    id: row.key,
    sourceType: row.sourceKind,
    customerName: row.customerName,
    customerId: row.customerId,
    referenceNo: row.referenceNo,
    linkedInvoiceNos: row.linkedInvoiceNos,
    linkedInvoiceIds: row.linkedInvoiceIds,
    eligibleCreditAmount: split.eligibleCreditAmount,
    gstAmount: split.gstAmount,
    cgstAmount: split.cgstAmount,
    sgstAmount: split.sgstAmount,
    igstAmount: split.igstAmount,
    totalAmount: split.totalAmount,
    status: "Pending",
    schemeSettlementKey: row.schemeSettlementKey ?? row.key,
    schemeName: row.schemeName,
  };
}

function buildPendingCreditNotesList(): PendingCreditNoteRow[] {
  const rows: PendingCreditNoteRow[] = [];

  for (const ret of getSalesReturnRecords()) {
    if (ret.status === "rejected") continue;
    if (hasCreditNoteForReturn(ret)) continue;
    if (ret.status !== "approved" && ret.status !== "pending_approval") continue;
    rows.push(salesReturnToPendingRow(ret));
  }

  for (const opt of listAllSchemePendingSettlements()) {
    if (hasCreditNoteForScheme(opt.key)) continue;
    rows.push(schemeToPendingRow(opt));
  }

  return rows.sort((a, b) => b.referenceNo.localeCompare(a.referenceNo));
}

export function invalidatePendingCreditNotesListCache(): void {
  invalidateModuleDataCache(MODULE_CACHE_KEYS.pendingCreditNotes);
}

export function listPendingCreditNotes(): PendingCreditNoteRow[] {
  return readThroughModuleCache(MODULE_CACHE_KEYS.pendingCreditNotes, buildPendingCreditNotesList);
}

export function getPendingCreditNoteRow(
  id: string,
  sourceType?: PendingCreditNoteSourceType,
): PendingCreditNoteRow | undefined {
  return listPendingCreditNotes().find(
    (r) => r.id === id && (!sourceType || r.sourceType === sourceType),
  );
}

export function filterPendingCreditNotes(
  rows: PendingCreditNoteRow[],
  search: string,
  sourceFilter: string,
): PendingCreditNoteRow[] {
  let r = rows;
  if (sourceFilter && sourceFilter !== "all") {
    r = r.filter((x) => x.sourceType === sourceFilter);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    r = r.filter(
      (x) =>
        x.referenceNo.toLowerCase().includes(q) ||
        x.customerName.toLowerCase().includes(q) ||
        PENDING_CREDIT_SOURCE_LABELS[x.sourceType].toLowerCase().includes(q) ||
        x.linkedInvoiceNos.some((inv) => inv.toLowerCase().includes(q)) ||
        x.schemeName?.toLowerCase().includes(q),
    );
  }
  return r;
}

export const PENDING_SOURCE_FILTER_OPTIONS: { value: PendingCreditNoteSourceType; label: string }[] = [
  { value: "sales_return", label: "Sales Return" },
  { value: "cash_discount", label: "Cash Discount" },
  { value: "near_expiry", label: "Near Expiry Scheme" },
  { value: "festive_scheme", label: "Festive Scheme" },
  { value: "payment_discount", label: "Payment Discount" },
  { value: "turnover_discount", label: "Turnover Discount" },
];
