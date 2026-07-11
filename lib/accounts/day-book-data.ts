import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  getPostedVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-data";
import { resolveSourceDocumentLink } from "@/lib/accounts/ledger-source-resolver";
import { roundMoney } from "@/lib/accounts/money-format";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";
import { matchesVoucherTypeFilter } from "@/lib/accounts/report-multi-filter-utils";

export type DayBookVoucherType =
  | "sales_invoice"
  | "purchase_invoice"
  | "journal"
  | "receipt"
  | "payment"
  | "contra"
  | "credit_note"
  | "debit_note";

export type DayBookStatus = "posted";

export interface DayBookLedgerLine {
  id: string;
  ledgerId: number | null;
  ledgerName: string;
  narration: string;
  debit: number;
  credit: number;
  generalLedgerHref: string;
}

export interface DayBookVoucherGroup {
  id: string;
  sourceId: number;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  narration: string;
  lines: DayBookLedgerLine[];
  totalDebit: number;
  totalCredit: number;
  isUnbalanced: boolean;
  createdBy: string;
  status: DayBookStatus;
  branch: string;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
  createdAt: string;
}

/** Flat row used for export and legacy integrations. */
export interface DayBookEntry {
  id: string;
  sourceId: number;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  narration: string;
  debit: number;
  credit: number;
  ledgerId: number | null;
  generalLedgerHref: string;
  isVoucherHeader: boolean;
  isUnbalancedVoucher: boolean;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
}

export const DAY_BOOK_VOUCHER_TYPE_OPTIONS: { value: DayBookVoucherType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "sales_invoice", label: "Sales Invoice" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "journal", label: "Journal Voucher" },
  { value: "contra", label: "Contra Voucher" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

export const DAY_BOOK_TYPE_LABELS: Record<DayBookVoucherType, string> = {
  sales_invoice: "Sales Invoice",
  purchase_invoice: "Purchase Invoice",
  journal: "Journal Voucher",
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  contra: "Contra Voucher",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
};

const VOUCHER_TYPE_TO_DAY_BOOK: Record<VoucherTypeCode, DayBookVoucherType> = {
  sales: "sales_invoice",
  purchase: "purchase_invoice",
  journal: "journal",
  receipt: "receipt",
  payment: "payment",
  contra: "contra",
  credit_note: "credit_note",
  debit_note: "debit_note",
};

export type DayBookSortKey =
  | "date"
  | "voucherNo"
  | "voucherType"
  | "partyLedger"
  | "narration"
  | "debit"
  | "credit";

export interface DayBookFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  voucherType?: DayBookVoucherType | "all" | string | string[];
  financialYearId?: number | "all";
}

export interface DayBookSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  voucherCount: number;
  lineCount: number;
  unbalancedVoucherCount: number;
}

export function formatDayBookDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function mapVoucherType(code: VoucherTypeCode): DayBookVoucherType {
  return VOUCHER_TYPE_TO_DAY_BOOK[code];
}

function resolveSourceId(v: AccountingVoucher): number {
  const ref = v.referenceNo?.trim() || "";
  switch (v.voucherType) {
    case "sales":
      return loadInvoices().find((i) => i.invoiceNo === ref)?.id ?? v.id;
    case "purchase":
      return loadPurchaseInvoices().find((i) => i.invoiceNo === ref)?.id ?? v.id;
    case "credit_note":
      return loadCreditNotes().find((n) => n.creditNoteNo === ref)?.id ?? v.id;
    case "debit_note":
      return loadDebitNotes().find((n) => n.debitNoteNo === ref)?.id ?? v.id;
    default:
      return v.id;
  }
}

function buildLedgerLines(v: AccountingVoucher): DayBookLedgerLine[] {
  const narration = v.narration?.trim() || "—";
  return v.lines
    .filter((line) => roundMoney(line.debit) > 0 || roundMoney(line.credit) > 0)
    .map((line, index) => ({
      id: `voucher-${v.id}-line-${line.id ?? index}`,
      ledgerId: line.ledgerId,
      ledgerName: line.ledgerName?.trim() || "—",
      narration: line.remarks?.trim() || narration,
      debit: roundMoney(line.debit),
      credit: roundMoney(line.credit),
      generalLedgerHref: line.ledgerId ? buildGeneralLedgerHref(line.ledgerId) : "/accounts/reports/ledger",
    }));
}

function resolvePartyLedger(v: AccountingVoucher, lines: DayBookLedgerLine[]): string {
  const debitLine = lines.find((l) => l.debit > 0);
  const creditLine = lines.find((l) => l.credit > 0);

  switch (v.voucherType) {
    case "sales":
    case "debit_note":
    case "payment":
      return debitLine?.ledgerName ?? creditLine?.ledgerName ?? "—";
    case "purchase":
    case "credit_note":
    case "receipt":
      return creditLine?.ledgerName ?? debitLine?.ledgerName ?? "—";
    default:
      return debitLine?.ledgerName ?? creditLine?.ledgerName ?? lines[0]?.ledgerName ?? "—";
  }
}

function voucherToDayBookGroup(v: AccountingVoucher): DayBookVoucherGroup | null {
  const lines = buildLedgerLines(v);
  if (lines.length === 0) return null;

  const totalDebit = roundMoney(lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = roundMoney(lines.reduce((s, l) => s + l.credit, 0));
  const voucherType = mapVoucherType(v.voucherType);
  const sourceLink = resolveSourceDocumentLink(v);

  return {
    id: `voucher-${v.id}`,
    sourceId: resolveSourceId(v),
    date: v.date,
    voucherNo: statementVoucherNo(v),
    voucherType,
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS[voucherType],
    partyLedger: resolvePartyLedger(v, lines),
    narration: v.narration?.trim() || "—",
    lines,
    totalDebit,
    totalCredit,
    isUnbalanced: totalDebit !== totalCredit,
    createdBy: v.createdBy ?? "—",
    status: "posted",
    branch: "—",
    financialYearId: v.financialYearId,
    financialYearName: v.financialYearName ?? "",
    viewHref: sourceLink.href,
    createdAt: v.date,
  };
}

/** Day Book — all posted vouchers with full double-entry ledger lines. */
export function buildDayBookVoucherGroups(): DayBookVoucherGroup[] {
  try {
    return getPostedVouchers()
      .map(voucherToDayBookGroup)
      .filter((g): g is DayBookVoucherGroup => g != null)
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return a.voucherNo.localeCompare(b.voucherNo);
      });
  } catch {
    return [];
  }
}

/** @deprecated Use buildDayBookVoucherGroups — kept for callers expecting flat rows. */
export function buildDayBookEntries(): DayBookEntry[] {
  return flattenDayBookGroups(buildDayBookVoucherGroups());
}

export function flattenDayBookGroups(groups: DayBookVoucherGroup[]): DayBookEntry[] {
  const rows: DayBookEntry[] = [];
  for (const group of groups) {
    for (const line of group.lines) {
      rows.push({
        id: line.id,
        sourceId: group.sourceId,
        date: group.date,
        voucherNo: group.voucherNo,
        voucherType: group.voucherType,
        voucherTypeLabel: group.voucherTypeLabel,
        partyLedger: line.ledgerName,
        narration: line.narration,
        debit: line.debit,
        credit: line.credit,
        ledgerId: line.ledgerId,
        generalLedgerHref: line.generalLedgerHref,
        isVoucherHeader: false,
        isUnbalancedVoucher: group.isUnbalanced,
        financialYearId: group.financialYearId,
        financialYearName: group.financialYearName,
        viewHref: group.viewHref,
      });
    }
  }
  return rows;
}

export function filterDayBookVoucherGroups(
  groups: DayBookVoucherGroup[],
  filters: DayBookFilters,
): DayBookVoucherGroup[] {
  const q = filters.search?.trim().toLowerCase() ?? "";

  return groups.filter((g) => {
    if (filters.dateFrom && g.date < filters.dateFrom) return false;
    if (filters.dateTo && g.date > filters.dateTo) return false;
    if (!matchesVoucherTypeFilter(filters.voucherType, g.voucherType)) return false;
    if (
      filters.financialYearId &&
      filters.financialYearId !== "all" &&
      g.financialYearId !== filters.financialYearId
    ) {
      return false;
    }
    if (q) {
      const haystack = [
        g.voucherNo,
        g.voucherTypeLabel,
        g.partyLedger,
        g.narration,
        ...g.lines.map((l) => l.ledgerName),
        ...g.lines.map((l) => l.narration),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** @deprecated Use filterDayBookVoucherGroups */
export function filterDayBookEntries(
  entries: DayBookEntry[],
  filters: DayBookFilters,
): DayBookEntry[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  return entries.filter((e) => {
    if (filters.dateFrom && e.date < filters.dateFrom) return false;
    if (filters.dateTo && e.date > filters.dateTo) return false;
    if (!matchesVoucherTypeFilter(filters.voucherType, e.voucherType)) return false;
    if (
      filters.financialYearId &&
      filters.financialYearId !== "all" &&
      e.financialYearId !== filters.financialYearId
    ) {
      return false;
    }
    if (q) {
      const haystack = `${e.voucherNo} ${e.voucherTypeLabel} ${e.partyLedger} ${e.narration}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortDayBookVoucherGroups(
  groups: DayBookVoucherGroup[],
  sortKey: DayBookSortKey,
  sortDir: "asc" | "desc",
): DayBookVoucherGroup[] {
  const sorted = [...groups].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
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
      case "narration":
        cmp = a.narration.localeCompare(b.narration);
        break;
      case "debit":
        cmp = a.totalDebit - b.totalDebit;
        break;
      case "credit":
        cmp = a.totalCredit - b.totalCredit;
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

/** @deprecated Use sortDayBookVoucherGroups */
export function sortDayBookEntries(
  entries: DayBookEntry[],
  sortKey: DayBookSortKey,
  sortDir: "asc" | "desc",
): DayBookEntry[] {
  const sorted = [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
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
      case "narration":
        cmp = a.narration.localeCompare(b.narration);
        break;
      case "debit":
        cmp = a.debit - b.debit;
        break;
      case "credit":
        cmp = a.credit - b.credit;
        break;
      default:
        cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeDayBookSummary(groups: DayBookVoucherGroup[]): DayBookSummary {
  const lineCount = groups.reduce((s, g) => s + g.lines.length, 0);
  const totalDebit = roundMoney(
    groups.reduce((s, g) => s + g.lines.reduce((ls, l) => ls + l.debit, 0), 0),
  );
  const totalCredit = roundMoney(
    groups.reduce((s, g) => s + g.lines.reduce((ls, l) => ls + l.credit, 0), 0),
  );
  const difference = roundMoney(totalDebit - totalCredit);
  const unbalancedVoucherCount = groups.filter((g) => g.isUnbalanced).length;

  return {
    totalDebit,
    totalCredit,
    isBalanced: difference === 0,
    difference,
    voucherCount: groups.length,
    lineCount,
    unbalancedVoucherCount,
  };
}

export function getActiveFinancialYearId(): number | null {
  return loadFinancialYears().find((fy) => fy.status === "active")?.id ?? null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Default Day Book range — first day of current FY through today. */
export function defaultDayBookDateFrom(): string {
  return demoFinancialYearStart();
}

export const DAY_BOOK_DEMO_VOUCHER_PATTERN =
  /^(SI|PI|JV|RV|PV|CN|DN|CV)-\d{4}$/;

export function isDayBookDemoVoucherNo(voucherNo: string): boolean {
  return DAY_BOOK_DEMO_VOUCHER_PATTERN.test(voucherNo);
}
