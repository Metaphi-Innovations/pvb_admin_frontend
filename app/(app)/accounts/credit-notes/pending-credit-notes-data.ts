/**
 * Pending Credit Notes — list-local mapping from GET /accounts/credit-note/pending.
 * Identity is pending_credit_note_id. No demo returnId / schemeKey navigation.
 */

import type { PendingCreditNoteListApiRow } from "./credit-note-list-api";

export type PendingCreditNoteSourceType =
  | "SALES_RETURN"
  | "SPECIAL_SCHEME"
  | "NEAR_EXPIRY"
  | "CASH_DISCOUNT"
  | "TURNOVER_DISCOUNT"
  | "SALES_INVOICE"
  | "DIRECT";

export type PendingCreditNoteStatus = "PENDING" | "CONVERTED" | "CANCELLED";

export type PendingSourceFilter = "all" | "sales_return" | "scheme";

export interface PendingCreditNoteRow {
  id: string;
  pending_credit_note_id: string;
  sourceType: PendingCreditNoteSourceType | string;
  status: PendingCreditNoteStatus | string;
  customerName: string;
  referenceNo: string;
  linkedInvoiceNos: string[];
  eligibleCreditAmount: number;
  gstAmount: number;
  totalAmount: number;
  schemeName?: string;
  schemeType?: string;
  schemeCode?: string;
  schemePeriod?: string;
  eligibleDate?: string;
  eligibleBaseAmount?: number;
  credit_note_id?: string | null;
  credit_note_number?: string | null;
  referenceCount?: number;
}

function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
}

function toDate(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}

export const PENDING_CREDIT_SOURCE_LABELS: Record<string, string> = {
  SALES_RETURN: "Sales Return",
  SPECIAL_SCHEME: "Special Scheme",
  NEAR_EXPIRY: "Near Expiry",
  CASH_DISCOUNT: "Cash Discount",
  TURNOVER_DISCOUNT: "Turnover Discount",
  SALES_INVOICE: "Sales Invoice",
  DIRECT: "Direct",
  sales_return: "Sales Return",
  scheme: "Scheme",
};

const SCHEME_SOURCES = new Set([
  "SPECIAL_SCHEME",
  "NEAR_EXPIRY",
  "CASH_DISCOUNT",
  "TURNOVER_DISCOUNT",
]);

export function isSchemePendingSource(source: string): boolean {
  return SCHEME_SOURCES.has(source);
}

const UUID_TAIL =
  /(?:^|:)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function codesForType(
  refs: PendingCreditNoteListApiRow["references"],
  type: string,
): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const ref of refs ?? []) {
    if (ref.reference_type !== type) continue;
    const code = ref.reference_code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    codes.push(code);
  }
  return codes;
}

function pickDisplayReference(raw: PendingCreditNoteListApiRow): string {
  const returnNos = codesForType(raw.references, "SALES_RETURN");
  if (returnNos.length) return returnNos.join(", ");

  const schemeCode = raw.scheme?.scheme_code?.trim();
  if (schemeCode) return schemeCode;

  const invoiceNos = codesForType(raw.references, "SALES_INVOICE");
  if (invoiceNos.length) return invoiceNos.join(", ");

  const key = raw.eligibility_key?.trim();
  if (key && !UUID_TAIL.test(key)) return key;

  return "—";
}

export function mapPendingListRow(raw: PendingCreditNoteListApiRow): PendingCreditNoteRow {
  const from = toDate(raw.eligibility_from);
  const to = toDate(raw.eligibility_to);
  const linkedInvoiceNos = codesForType(raw.references, "SALES_INVOICE");
  return {
    id: raw.pending_credit_note_id,
    pending_credit_note_id: raw.pending_credit_note_id,
    sourceType: raw.source_type || "",
    status: raw.status || "PENDING",
    customerName: raw.customer?.customer_name || "",
    referenceNo: pickDisplayReference(raw),
    linkedInvoiceNos,
    eligibleCreditAmount: toNum(raw.taxable_credit_amount ?? raw.eligible_base_amount),
    gstAmount: toNum(raw.gst_amount),
    totalAmount: toNum(raw.eligible_cn_amount),
    schemeName: raw.scheme?.scheme_name || undefined,
    schemeType: raw.scheme?.scheme_type || undefined,
    schemeCode: raw.scheme?.scheme_code || undefined,
    schemePeriod: from && to ? `${from} → ${to}` : from || to || undefined,
    eligibleDate: toDate(raw.eligibility_date),
    eligibleBaseAmount: toNum(raw.eligible_base_amount),
    credit_note_id: raw.credit_note?.credit_note_id || null,
    credit_note_number: raw.credit_note?.cn_number || null,
    referenceCount: raw._count?.references ?? 0,
  };
}

export function canGeneratePendingCreditNote(row: PendingCreditNoteRow): boolean {
  return row.status === "PENDING" && Boolean(row.pending_credit_note_id);
}

export function filterPendingCreditNotes(
  rows: PendingCreditNoteRow[],
  search: string,
  sourceFilter: string,
): PendingCreditNoteRow[] {
  let r = rows;
  if (sourceFilter === "sales_return") {
    r = r.filter((x) => x.sourceType === "SALES_RETURN");
  } else if (sourceFilter === "scheme") {
    r = r.filter((x) => isSchemePendingSource(String(x.sourceType)));
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    r = r.filter(
      (x) =>
        x.referenceNo.toLowerCase().includes(q) ||
        x.customerName.toLowerCase().includes(q) ||
        x.schemeName?.toLowerCase().includes(q) ||
        x.schemeCode?.toLowerCase().includes(q) ||
        x.schemeType?.toLowerCase().includes(q) ||
        x.linkedInvoiceNos.some((n) => n.toLowerCase().includes(q)) ||
        PENDING_CREDIT_SOURCE_LABELS[x.sourceType]?.toLowerCase().includes(q),
    );
  }
  return r;
}
