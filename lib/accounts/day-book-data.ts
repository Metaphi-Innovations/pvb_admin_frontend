import { loadInvoices, type InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  loadPurchaseInvoices,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import {
  loadCreditNotes,
  type CreditNoteRecord,
} from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import {
  loadDebitNotes,
  type DebitNoteRecord,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  isPostedForReports,
  resolveWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";

export type DayBookVoucherType =
  | "sales_invoice"
  | "purchase_invoice"
  | "journal"
  | "receipt"
  | "payment"
  | "credit_note"
  | "debit_note";

export type DayBookStatus = "posted" | "draft" | "cancelled";

export interface DayBookEntry {
  id: string;
  sourceId: number;
  date: string;
  time: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  narration: string;
  debit: number;
  credit: number;
  createdBy: string;
  status: DayBookStatus;
  branch: string;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
  createdAt: string;
}

export const DAY_BOOK_VOUCHER_TYPE_OPTIONS: { value: DayBookVoucherType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "sales_invoice", label: "Sales Invoice" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "journal", label: "Journal Entry" },
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

export const DAY_BOOK_TYPE_LABELS: Record<DayBookVoucherType, string> = {
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  journal: "Journal Entry",
  receipt: "Receipt",
  payment: "Payment",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

export type DayBookSortKey =
  | "date"
  | "time"
  | "voucherNo"
  | "voucherType"
  | "partyLedger"
  | "debit"
  | "credit"
  | "createdBy"
  | "status";

export interface DayBookFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  voucherType?: DayBookVoucherType | "all";
  branch?: string;
  financialYearId?: number | "all";
}

export interface DayBookSummary {
  totalVouchers: number;
  totalDebit: number;
  totalCredit: number;
  netDifference: number;
}

export function formatDayBookDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function extractTimeFromIso(iso?: string, fallback = "09:00"): string {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function resolveFinancialYearForDate(date: string): {
  financialYearId: number | null;
  financialYearName: string;
} {
  const fys = loadFinancialYears();
  const match = fys.find((fy) => date >= fy.startDate && date <= fy.endDate);
  const active = fys.find((fy) => fy.status === "active");
  return {
    financialYearId: match?.id ?? active?.id ?? null,
    financialYearName: match?.name ?? active?.name ?? "",
  };
}

function mapInvoiceStatus(inv: InvoiceRecord): DayBookStatus {
  if (inv.invoiceStatus === "cancelled") return "cancelled";
  if (!isPostedForReports(inv.workflow, inv.invoiceStatus)) {
    const ws = resolveWorkflowStatus(inv.workflow, inv.invoiceStatus);
    if (ws === "rejected") return "cancelled";
    return "draft";
  }
  return "posted";
}

function mapNoteStatus(status: string, workflow?: import("@/lib/accounts/accounts-maker-checker").AccountsDocumentWorkflow): DayBookStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (!isPostedForReports(workflow, status)) return "draft";
  return "posted";
}

function mapVoucherStatus(
  status: string,
  workflow?: import("@/lib/accounts/accounts-maker-checker").AccountsDocumentWorkflow,
): DayBookStatus {
  if (status === "cancelled" || status === "rejected") return "cancelled";
  if (!isPostedForReports(workflow, status)) return "draft";
  return "posted";
}

/** Day Book shows one-sided amounts per voucher — not double-entry on every row. */
function dayBookAmounts(
  amount: number,
  side: "debit" | "credit",
): { debit: number; credit: number } {
  const rounded = roundMoney(amount);
  if (rounded <= 0) return { debit: 0, credit: 0 };
  return side === "debit" ? { debit: rounded, credit: 0 } : { debit: 0, credit: rounded };
}

function journalDisplaySide(v: AccountingVoucher): "debit" | "credit" {
  const text = `${v.narration} ${v.referenceNo}`.toLowerCase();
  if (
    /provision|inventory adjustment|salary|accrual|income|round-off adjustment|round off/.test(text)
  ) {
    return "credit";
  }
  return "debit";
}

function entryFromSalesInvoice(inv: InvoiceRecord): DayBookEntry {
  const amount = roundMoney(inv.grandTotal);
  const { debit, credit } = dayBookAmounts(amount, "debit");
  const fy = resolveFinancialYearForDate(inv.invoiceDate);
  return {
    id: `si-${inv.id}`,
    sourceId: inv.id,
    date: inv.invoiceDate,
    time: extractTimeFromIso(inv.createdAt),
    voucherNo: inv.invoiceNo,
    voucherType: "sales_invoice",
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS.sales_invoice,
    partyLedger: inv.customerName || inv.receivableLedger || "—",
    narration: inv.remarks?.trim() || `Sales invoice to ${inv.customerName}`,
    debit,
    credit,
    createdBy: inv.createdBy,
    status: mapInvoiceStatus(inv),
    branch: inv.branch ?? "Head Office",
    financialYearId: fy.financialYearId,
    financialYearName: fy.financialYearName,
    viewHref: `/accounts/transactions/invoices/${inv.id}`,
    createdAt: inv.createdAt,
  };
}

function entryFromPurchaseInvoice(inv: PurchaseInvoiceRecord): DayBookEntry {
  const amount = roundMoney(inv.grandTotal);
  const { debit, credit } = dayBookAmounts(amount, "credit");
  const fy = resolveFinancialYearForDate(inv.invoiceDate);
  return {
    id: `pi-${inv.id}`,
    sourceId: inv.id,
    date: inv.invoiceDate,
    time: extractTimeFromIso(inv.createdAt),
    voucherNo: inv.invoiceNo,
    voucherType: "purchase_invoice",
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS.purchase_invoice,
    partyLedger: inv.vendorName || "—",
    narration: inv.remarks?.trim() || `Purchase invoice from ${inv.vendorName}`,
    debit,
    credit,
    createdBy: inv.createdBy,
    status: isPostedForReports(inv.workflow) ? "posted" : "draft",
    branch: "Head Office",
    financialYearId: fy.financialYearId,
    financialYearName: fy.financialYearName,
    viewHref: `/accounts/purchase-invoices/${inv.id}`,
    createdAt: inv.createdAt,
  };
}

function entryFromCreditNote(note: CreditNoteRecord): DayBookEntry {
  const amount = roundMoney(note.currentCreditAmount);
  const { debit, credit } = dayBookAmounts(amount, "credit");
  const fy = resolveFinancialYearForDate(note.creditNoteDate);
  return {
    id: `cn-${note.id}`,
    sourceId: note.id,
    date: note.creditNoteDate,
    time: extractTimeFromIso(note.createdAt),
    voucherNo: note.creditNoteNo,
    voucherType: "credit_note",
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS.credit_note,
    partyLedger: note.customerName || "—",
    narration: note.remarks?.trim() || note.reason || `Credit note — ${note.customerName}`,
    debit,
    credit,
    createdBy: note.createdBy,
    status: mapNoteStatus(note.status, note.workflow),
    branch: "Head Office",
    financialYearId: fy.financialYearId,
    financialYearName: fy.financialYearName,
    viewHref: `/accounts/transactions/credit-notes/${note.id}`,
    createdAt: note.createdAt,
  };
}

function entryFromDebitNote(note: DebitNoteRecord): DayBookEntry {
  const amount = roundMoney(note.currentDebitAmount || note.standaloneDebitAmount);
  const { debit, credit } = dayBookAmounts(amount, "debit");
  const fy = resolveFinancialYearForDate(note.debitNoteDate);
  return {
    id: `dn-${note.id}`,
    sourceId: note.id,
    date: note.debitNoteDate,
    time: extractTimeFromIso(note.createdAt),
    voucherNo: note.debitNoteNo,
    voucherType: "debit_note",
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS.debit_note,
    partyLedger: note.vendorName || "—",
    narration: note.remarks?.trim() || note.reason || `Debit note — ${note.vendorName}`,
    debit,
    credit,
    createdBy: note.createdBy,
    status: mapNoteStatus(note.status, note.workflow),
    branch: "Head Office",
    financialYearId: fy.financialYearId,
    financialYearName: fy.financialYearName,
    viewHref: `/accounts/transactions/debit-notes/${note.id}`,
    createdAt: note.createdAt,
  };
}

const VOUCHER_DAY_BOOK_TYPES = new Set<VoucherTypeCode>(["journal", "receipt", "payment"]);

function entryFromVoucher(v: AccountingVoucher): DayBookEntry | null {
  if (!VOUCHER_DAY_BOOK_TYPES.has(v.voucherType)) return null;

  const typeMap: Record<"journal" | "receipt" | "payment", DayBookVoucherType> = {
    journal: "journal",
    receipt: "receipt",
    payment: "payment",
  };

  const voucherType = typeMap[v.voucherType as "journal" | "receipt" | "payment"];
  const partyLine =
    v.lines.find((l) => l.contactName)?.contactName ||
    v.lines.find((l) => l.ledgerName && (l.debit > 0 || l.credit > 0))?.ledgerName ||
    "—";

  const fy = resolveFinancialYearForDate(v.date);
  const amount = roundMoney(Math.max(v.totalDebit, v.totalCredit));
  const receiptPaymentSide: "debit" | "credit" =
    voucherType === "receipt" ? "credit" : voucherType === "payment" ? "debit" : journalDisplaySide(v);
  const { debit, credit } = dayBookAmounts(amount, receiptPaymentSide);

  return {
    id: `v-${v.id}`,
    sourceId: v.id,
    date: v.date,
    time: "09:30",
    voucherNo: v.voucherNumber,
    voucherType,
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS[voucherType],
    partyLedger: partyLine,
    narration: v.narration?.trim() || v.referenceNo?.trim() || "—",
    debit,
    credit,
    createdBy: v.createdBy,
    status: mapVoucherStatus(v.status, v.workflow),
    branch: "Head Office",
    financialYearId: v.financialYearId ?? fy.financialYearId,
    financialYearName: v.financialYearName || fy.financialYearName,
    viewHref:
      voucherType === "journal"
        ? `/accounts/vouchers/view/${v.id}`
        : `/accounts/vouchers/view/${v.id}`,
    createdAt: `${v.date}T09:30:00.000Z`,
  };
}

export function buildDayBookEntries(): DayBookEntry[] {
  const entries: DayBookEntry[] = [];

  for (const inv of loadInvoices()) {
    entries.push(entryFromSalesInvoice(inv));
  }
  for (const inv of loadPurchaseInvoices()) {
    entries.push(entryFromPurchaseInvoice(inv));
  }
  for (const note of loadCreditNotes()) {
    if (note.currentCreditAmount > 0 || note.status !== "cancelled") {
      entries.push(entryFromCreditNote(note));
    }
  }
  for (const note of loadDebitNotes()) {
    const amt = note.currentDebitAmount || note.standaloneDebitAmount;
    if (amt > 0 || note.status !== "cancelled") {
      entries.push(entryFromDebitNote(note));
    }
  }
  for (const v of loadVouchers()) {
    const row = entryFromVoucher(v);
    if (row) entries.push(row);
  }

  const demoEntries = entries.filter((e) => isDayBookDemoVoucherNo(e.voucherNo));
  const result = demoEntries.length >= 10 ? demoEntries : entries;

  return result.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.time.localeCompare(b.time);
  });
}

export function filterDayBookEntries(
  entries: DayBookEntry[],
  filters: DayBookFilters,
): DayBookEntry[] {
  const q = filters.search?.trim().toLowerCase() ?? "";

  return entries.filter((e) => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (filters.voucherType && filters.voucherType !== "all" && e.voucherType !== filters.voucherType) {
      return false;
    }
    if (filters.branch && filters.branch !== "all" && e.branch !== filters.branch) return false;
    if (
      filters.financialYearId &&
      filters.financialYearId !== "all" &&
      e.financialYearId !== filters.financialYearId
    ) {
      return false;
    }
    if (q) {
      const haystack = `${e.voucherNo} ${e.partyLedger} ${e.narration}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortDayBookEntries(
  entries: DayBookEntry[],
  sortKey: DayBookSortKey,
  sortDir: "asc" | "desc",
): DayBookEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.time.localeCompare(b.time);
        break;
      case "time":
        cmp = a.time.localeCompare(b.time);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherType":
        cmp = a.voucherTypeLabel.localeCompare(b.voucherTypeLabel);
        break;
      case "partyLedger":
        cmp = a.partyLedger.localeCompare(b.partyLedger);
        break;
      case "debit":
        cmp = a.debit - b.debit;
        break;
      case "credit":
        cmp = a.credit - b.credit;
        break;
      case "createdBy":
        cmp = a.createdBy.localeCompare(b.createdBy);
        break;
      case "status":
        cmp = a.status.localeCompare(b.status);
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeDayBookSummary(entries: DayBookEntry[]): DayBookSummary {
  const totalDebit = roundMoney(entries.reduce((s, e) => s + e.debit, 0));
  const totalCredit = roundMoney(entries.reduce((s, e) => s + e.credit, 0));
  return {
    totalVouchers: entries.length,
    totalDebit,
    totalCredit,
    netDifference: roundMoney(totalDebit - totalCredit),
  };
}

export function getActiveFinancialYearId(): number | null {
  return loadFinancialYears().find((fy) => fy.status === "active")?.id ?? null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default Day Book range — last 6 days including today (covers Jun 25–30 demo window). */
export function defaultDayBookDateFrom(refDate = new Date()): string {
  const d = new Date(refDate);
  d.setDate(d.getDate() - 5);
  return d.toISOString().slice(0, 10);
}

export const DAY_BOOK_DEMO_VOUCHER_PATTERN =
  /^(SI|PI|JV|RV|PV|CN|DN)-\d{4}$/;

export function isDayBookDemoVoucherNo(voucherNo: string): boolean {
  return DAY_BOOK_DEMO_VOUCHER_PATTERN.test(voucherNo);
}
