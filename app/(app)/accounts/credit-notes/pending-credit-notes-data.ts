/**
 * Pending credit notes — sales returns and scheme settlements awaiting CN generation.
 * Reads sales return + invoice data (read-only); does not modify non-Accounts modules.
 */

import {
  getSalesReturnRecords,
  getReturnTotalAmount,
  type SalesReturnRecord,
} from "@/app/(app)/sales/orders/sales-return-data";
import {
  listPendingSchemeSettlementOptions,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";
import {
  buildReferenceFromSalesReturn,
  computeCreditNoteGstSplit,
  loadCreditNotes,
  recalcAllCreditLines,
} from "./credit-notes-data";

const CREDIT_NOTES_STORAGE_KEY = "ds_accounts_credit_notes_v2";

type CreditNoteLink = {
  sourceReturnId?: string;
  sourceReturnNo?: string;
  schemeSettlementKey?: string;
  status: string;
};

function loadCreditNoteLinks(): CreditNoteLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CREDIT_NOTES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreditNoteLink[]) : [];
  } catch {
    return [];
  }
}

export type PendingCreditNoteSourceType = "sales_return" | "scheme";

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

export function hasCreditNoteForReturn(ret: SalesReturnRecord): boolean {
  if (ret.creditNoteId) return true;
  const notes = loadCreditNoteLinks();
  return notes.some(
    (cn) =>
      cn.status !== "cancelled" &&
      (cn.sourceReturnId === ret.id ||
        cn.sourceReturnNo === ret.returnNumber),
  );
}

export function hasCreditNoteForScheme(key: string): boolean {
  const notes = loadCreditNoteLinks();
  return notes.some(
    (cn) => cn.status !== "cancelled" && cn.schemeSettlementKey === key,
  );
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
  const gstRate = 0.18;
  const taxable = Math.round((total / (1 + gstRate)) * 100) / 100;
  const gst = Math.round((total - taxable) * 100) / 100;
  const invoiceNos = ret.sourceInvoiceNo ? [ret.sourceInvoiceNo] : [];
  const invoiceIds = ret.sourceInvoiceId ? [ret.sourceInvoiceId] : [];

  return {
    eligibleCreditAmount: taxable,
    gstAmount: gst,
    cgstAmount: Math.round((gst / 2) * 100) / 100,
    sgstAmount: Math.round((gst / 2) * 100) / 100,
    igstAmount: 0,
    totalAmount: total,
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

function schemeToPendingRow(opt: PendingSchemeSettlementOption): PendingCreditNoteRow {
  const total = opt.estimatedBenefitAmount;
  const gstRate = 0.18;
  const taxable = Math.round((total / (1 + gstRate)) * 100) / 100;
  const gst = Math.round((total - taxable) * 100) / 100;

  return {
    id: opt.key,
    sourceType: "scheme",
    customerName: opt.customerName,
    customerId: opt.customerId,
    referenceNo: opt.schemeCode,
    linkedInvoiceNos: [opt.invoiceNo],
    linkedInvoiceIds: [opt.invoiceId],
    eligibleCreditAmount: taxable,
    gstAmount: gst,
    cgstAmount: Math.round((gst / 2) * 100) / 100,
    sgstAmount: Math.round((gst / 2) * 100) / 100,
    igstAmount: 0,
    totalAmount: total,
    status: "Pending",
    schemeSettlementKey: opt.key,
    schemeName: opt.schemeName,
  };
}

export function listPendingCreditNotes(): PendingCreditNoteRow[] {
  const rows: PendingCreditNoteRow[] = [];

  for (const ret of getSalesReturnRecords()) {
    if (ret.status === "rejected") continue;
    if (hasCreditNoteForReturn(ret)) continue;
    if (ret.status !== "approved" && ret.status !== "pending_approval") continue;
    rows.push(salesReturnToPendingRow(ret));
  }

  for (const opt of listPendingSchemeSettlementOptions()) {
    if (hasCreditNoteForScheme(opt.key)) continue;
    rows.push(schemeToPendingRow(opt));
  }

  return rows.sort((a, b) => b.referenceNo.localeCompare(a.referenceNo));
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
        x.linkedInvoiceNos.some((inv) => inv.toLowerCase().includes(q)) ||
        x.schemeName?.toLowerCase().includes(q),
    );
  }
  return r;
}

export const PENDING_CREDIT_SOURCE_LABELS: Record<PendingCreditNoteSourceType, string> = {
  sales_return: "Sales Return",
  scheme: "Scheme",
};
