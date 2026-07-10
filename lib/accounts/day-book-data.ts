import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { DAY_BOOK_DEMO_ENTRIES } from "@/lib/accounts/day-book-demo-data";
import { roundMoney } from "@/lib/accounts/money-format";
import { getPostedManualVouchersForDayBook } from "@/lib/accounts/voucher-register-data";
import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";

export type DayBookVoucherType =
  | "sales_invoice"
  | "purchase_invoice"
  | "journal"
  | "receipt"
  | "payment"
  | "contra"
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
  voucherType?: DayBookVoucherType | "all";
  financialYearId?: number | "all";
}

export interface DayBookSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
}

export function formatDayBookDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function voucherToDayBookEntry(v: AccountingVoucher): DayBookEntry {
  const partyLine =
    v.lines.find((l) => (Number(l.debit) || 0) > 0 && l.ledgerName) ??
    v.lines.find((l) => l.ledgerName) ??
    v.lines[0];
  const voucherType = v.voucherType as DayBookVoucherType;

  return {
    id: `voucher-${v.id}`,
    sourceId: v.id,
    date: v.date,
    time: "00:00:00",
    voucherNo: v.voucherNumber,
    voucherType,
    voucherTypeLabel: DAY_BOOK_TYPE_LABELS[voucherType] ?? v.voucherType,
    partyLedger: partyLine?.ledgerName?.trim() || "—",
    narration: v.narration?.trim() || "—",
    debit: roundMoney(v.totalDebit),
    credit: roundMoney(v.totalCredit),
    createdBy: v.createdBy ?? "—",
    status: "posted",
    branch: "—",
    financialYearId: v.financialYearId,
    financialYearName: v.financialYearName ?? "",
    viewHref: `/accounts/vouchers/view/${v.id}`,
    createdAt: v.date,
  };
}

/** Day Book — posted vouchers (live) merged with legacy demo rows. */
export function buildDayBookEntries(): DayBookEntry[] {
  const liveNos = new Set<string>();
  let live: DayBookEntry[] = [];
  try {
    live = getPostedManualVouchersForDayBook().map(voucherToDayBookEntry);
    live.forEach((e) => liveNos.add(e.voucherNo));
  } catch {
    live = [];
  }

  const demo = DAY_BOOK_DEMO_ENTRIES.filter((e) => !liveNos.has(e.voucherNo));
  return [...demo, ...live].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.voucherNo.localeCompare(b.voucherNo);
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

export function computeDayBookSummary(entries: DayBookEntry[]): DayBookSummary {
  const totalDebit = roundMoney(entries.reduce((s, e) => s + e.debit, 0));
  const totalCredit = roundMoney(entries.reduce((s, e) => s + e.credit, 0));
  const difference = roundMoney(totalDebit - totalCredit);
  return {
    totalDebit,
    totalCredit,
    isBalanced: difference === 0,
    difference,
  };
}

export function getActiveFinancialYearId(): number | null {
  return loadFinancialYears().find((fy) => fy.status === "active")?.id ?? null;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

/** Default Day Book range — first day of current FY through today. */
export function defaultDayBookDateFrom(): string {
  return demoFinancialYearStart();
}

export const DAY_BOOK_DEMO_VOUCHER_PATTERN =
  /^(SI|PI|JV|RV|PV|CN|DN|CV)-\d{4}$/;

export function isDayBookDemoVoucherNo(voucherNo: string): boolean {
  return DAY_BOOK_DEMO_VOUCHER_PATTERN.test(voucherNo);
}
