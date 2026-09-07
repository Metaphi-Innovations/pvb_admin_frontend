import { computeNoteParticularTotals } from "@/components/accounts/voucher-form/NoteParticularsTable";
import { formatMoney } from "@/lib/accounts/money-format";
import type {
  CreditNoteFormLine,
  CreditNoteFormReference,
  CreditNoteSourceType,
  CreditNoteStatus,
  DirectLineDraft,
  ParticularColumnKey,
  PendingCreditNoteDetail,
} from "./credit-note-form-types";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function toNum(value: unknown, fallback = 0): number {
  if (value == null || value === "") return fallback;
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const n = parseFloat(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function toDateInput(value: unknown): string {
  if (!value) return "";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function snapshotStr(
  snap: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!snap) return "";
  for (const key of keys) {
    const v = snap[key];
    if (v != null && String(v).trim()) return String(v);
  }
  return "";
}

export function formatCnMoney(value: unknown): string {
  return formatMoney(toNum(value));
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  SALES_INVOICE: "Sales Invoice",
  SALES_RETURN: "Sales Return",
  CASH_DISCOUNT: "Cash Discount",
  SPECIAL_SCHEME: "Special Scheme",
  TURNOVER_DISCOUNT: "Turnover Discount",
  NEAR_EXPIRY: "Near Expiry",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
  REVERSED: "Reversed",
  PENDING: "Pending",
  CONVERTED: "Converted",
};

export function statusChipClass(status: string | undefined): string {
  switch (status) {
    case "POSTED":
    case "APPROVED":
    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700";
    case "PENDING_APPROVAL":
    case "PENDING":
      return "bg-amber-50 text-amber-700";
    case "REJECTED":
    case "CANCELLED":
    case "REVERSED":
      return "bg-red-50 text-red-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function isPendingGeneratedSource(source: string | undefined): boolean {
  return Boolean(
    source &&
      source !== "DIRECT" &&
      source !== "SALES_INVOICE",
  );
}

export function extractCreditNoteIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const match = pathname.match(
    /\/accounts\/transactions\/credit-notes\/([0-9a-f-]{36})(?:\/edit)?\/?$/i,
  );
  return match?.[1] && isUuid(match[1]) ? match[1] : null;
}

export function newDirectLine(): DirectLineDraft {
  return {
    key: `line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    ledger_id: "",
    ledger_name: "",
    quantity: "1",
    rate: "",
    taxable_amount: "",
    gst_applicable: false,
    gst_rate: "18",
  };
}

export function computeDirectLinePreview(line: DirectLineDraft, interstate: boolean) {
  const qty = line.quantity.trim();
  const rate = line.rate.trim();
  const hasQtyRate = toNum(qty) > 0 && toNum(rate) > 0;
  const taxable = hasQtyRate
    ? String(Math.round(toNum(qty) * toNum(rate) * 100) / 100)
    : line.taxable_amount;
  return computeNoteParticularTotals(
    hasQtyRate ? qty : "1",
    hasQtyRate ? rate : taxable,
    line.gst_applicable,
    line.gst_applicable ? line.gst_rate : "0",
    interstate,
  );
}

export function lineProductName(line: CreditNoteFormLine): string {
  return (
    line.product?.product_name ||
    snapshotStr(line.product_snapshot, "product_name", "name") ||
    line.description ||
    "—"
  );
}

export function lineProductSku(line: CreditNoteFormLine): string {
  return (
    line.product?.product_code ||
    snapshotStr(line.product_snapshot, "sku", "product_code", "product_sku") ||
    ""
  );
}

export function lineHsnCode(line: CreditNoteFormLine): string {
  return (
    snapshotStr(line.hsn_snapshot, "hsn_code", "code", "hsn") ||
    snapshotStr(line.product_snapshot, "hsn_code", "hsn") ||
    ""
  );
}

export function lineBatchNo(line: CreditNoteFormLine): string {
  return snapshotStr(line.batch_snapshot, "batch_no", "batch_number") || "—";
}

export function lineExpiry(line: CreditNoteFormLine): string {
  const raw = snapshotStr(line.batch_snapshot, "expiry_date");
  return raw ? toDateInput(raw) || raw : "—";
}

export function lineUnitRate(line: CreditNoteFormLine): string {
  const qty = lineQty(line);
  const taxable = lineTaxable(line);
  if (qty > 0 && taxable > 0) {
    return formatCnMoney(taxable / qty);
  }
  if (line.discount_type === "Percentage") {
    return `${toNum(line.discount_value)}%`;
  }
  if (line.discount_value != null) {
    return formatCnMoney(line.discount_value);
  }
  return "—";
}

export function lineLedgerName(line: CreditNoteFormLine): string {
  return (
    line.ledger?.ledger_name ||
    snapshotStr(line.ledger_snapshot, "ledger_name") ||
    "—"
  );
}

export function lineQty(line: CreditNoteFormLine): number {
  return toNum(line.quantity ?? line.eligible_quantity);
}

export function lineTaxable(line: CreditNoteFormLine): number {
  return toNum(line.taxable_amount ?? line.taxable_credit_amount);
}

export function particularsColumnsForSource(
  source: CreditNoteSourceType | string | undefined,
  opts?: { gstOn?: boolean; interstate?: boolean; editable?: boolean },
): ParticularColumnKey[] {
  const gstOn = Boolean(opts?.gstOn);
  const interstate = Boolean(opts?.interstate);
  const editable = Boolean(opts?.editable);

  if (source === "SALES_RETURN") {
    const cols: ParticularColumnKey[] = [
      "product",
      "batch",
      "expiry",
      "qty",
      "rate_benefit",
      "eligible_base",
      "gst_rate",
    ];
    if (interstate) cols.push("igst");
    else cols.push("cgst", "sgst");
    cols.push("cn_amount");
    return cols;
  }

  // Direct Credit Note / Sales Invoice keeps QTY and RATE / BENEFIT
  if (!source || source === "DIRECT" || source === "SALES_INVOICE") {
    const cols: ParticularColumnKey[] = [
      "particular",
      "ledger",
      "qty",
      "rate_benefit",
      "eligible_base",
      "gst_toggle",
    ];
    if (gstOn) {
      cols.push("gst_rate");
      if (interstate) cols.push("igst");
      else cols.push("cgst", "sgst");
    }
    cols.push("cn_amount");
    if (editable) cols.push("actions");
    return cols;
  }

  // Scheme credit notes: user requested "dont want the qty and rate / benefit"
  const cols: ParticularColumnKey[] = [
    "particular",
    "ledger",
    "eligible_base",
    "gst_toggle",
  ];
  if (gstOn) {
    cols.push("gst_rate");
    if (interstate) cols.push("igst");
    else cols.push("cgst", "sgst");
  }
  cols.push("cn_amount");
  return cols;
}

/** Preview GST split for a pending/return CN line after GST % change. */
export function applyPendingLineGstPreview(
  line: CreditNoteFormLine,
  gstRateRaw: string | number,
  interstate: boolean,
): CreditNoteFormLine {
  const taxable = lineTaxable(line);
  const rate = Math.max(0, toNum(gstRateRaw));
  const gstAmount = Math.round(((taxable * rate) / 100) * 100) / 100;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (gstAmount > 0) {
    if (interstate) igst = gstAmount;
    else {
      cgst = Math.round((gstAmount / 2) * 100) / 100;
      sgst = Math.round((gstAmount - cgst) * 100) / 100;
    }
  }
  const halfRate = Math.round((rate / 2) * 10000) / 10000;
  return {
    ...line,
    gst_rate: rate,
    cgst_rate: interstate ? 0 : halfRate,
    sgst_rate: interstate ? 0 : halfRate,
    igst_rate: interstate ? rate : 0,
    cgst_amount: cgst,
    sgst_amount: sgst,
    igst_amount: igst,
    gst_amount: gstAmount,
    line_total: Math.round((taxable + gstAmount) * 100) / 100,
  };
}

export function pendingLineKey(line: CreditNoteFormLine): string {
  return (
    line.pending_credit_note_line_id ||
    line.credit_note_line_id ||
    `line-${line.line_number ?? 0}`
  );
}

export function columnLabel(key: ParticularColumnKey): string {
  switch (key) {
    case "particular":
      return "Particular / Description";
    case "product":
      return "Product";
    case "batch":
      return "Batch";
    case "expiry":
      return "Expiry Date";
    case "qty":
      return "Qty";
    case "eligible_base":
      return "Eligible Base";
    case "rate_benefit":
      return "Rate / Benefit";
    case "ledger":
      return "Supporting Ledger";
    case "gst":
      return "GST";
    case "gst_toggle":
      return "GST";
    case "gst_rate":
      return "GST %";
    case "cgst":
      return "CGST";
    case "sgst":
      return "SGST";
    case "igst":
      return "IGST";
    case "cn_amount":
      return "CN Amount";
    case "actions":
      return "";
    default:
      return key;
  }
}

export function invoiceRefsOf(
  pending: PendingCreditNoteDetail | null | undefined,
): CreditNoteFormReference[] {
  if (!pending) return [];
  if (pending.invoice_references?.length) return pending.invoice_references;
  return (pending.references ?? []).filter((r) => r.reference_type === "SALES_INVOICE");
}

export function receiptRefsOf(
  pending: PendingCreditNoteDetail | null | undefined,
): CreditNoteFormReference[] {
  if (!pending) return [];
  if (pending.receipt_references?.length) return pending.receipt_references;
  return (pending.references ?? []).filter((r) => r.reference_type === "RECEIPT_VOUCHER");
}

export function returnRefsOf(
  pending: PendingCreditNoteDetail | null | undefined,
): CreditNoteFormReference[] {
  if (!pending) return [];
  if (pending.sales_return_references?.length) return pending.sales_return_references;
  return (pending.references ?? []).filter((r) => r.reference_type === "SALES_RETURN");
}

export function formatPeriod(from?: string | null, to?: string | null): string {
  const a = toDateInput(from);
  const b = toDateInput(to);
  if (a && b) return `${a} → ${b}`;
  return a || b || "—";
}

export function summaryValue(
  summary: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!summary) return "";
  for (const key of keys) {
    const v = summary[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

export function canEditDocument(status: CreditNoteStatus | string | undefined): boolean {
  return !status || status === "DRAFT" || status === "REJECTED";
}

export function isReadOnlyStatus(status: CreditNoteStatus | string | undefined): boolean {
  return status === "POSTED" || status === "CANCELLED" || status === "REVERSED";
}

export function pageTitleFor(opts: {
  isEdit: boolean;
  isPendingGenerate: boolean;
}): string {
  if (opts.isEdit) return "Edit Credit Note";
  if (opts.isPendingGenerate) return "Generate Credit Note";
  return "Create Credit Note";
}
