import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { getJournalVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { roundMoney } from "@/lib/accounts/money-format";

export interface JournalRegisterRow {
  id: number;
  date: string;
  journalNo: string;
  referenceNo: string;
  debitLedger: string;
  creditLedger: string;
  debitLedgerId: number | null;
  creditLedgerId: number | null;
  narration: string;
  debitAmount: number;
  creditAmount: number;
  financialYearId: number | null;
}

export type JournalRegisterSortKey =
  | "date"
  | "journalNo"
  | "debitLedger"
  | "creditLedger"
  | "debitAmount"
  | "creditAmount";

export interface JournalRegisterFilters {
  dateFrom?: string;
  dateTo?: string;
  ledgerSearch?: string;
  search?: string;
}

export interface JournalRegisterSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  count: number;
}

export function formatJournalRegisterDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

/** Static fallback rows removed — register reads posted journal vouchers only. */

function voucherToRegisterRow(v: AccountingVoucher): JournalRegisterRow {
  const debitLine = v.lines.find((l) => l.debit > 0) ?? v.lines[0];
  const creditLine = v.lines.find((l) => l.credit > 0) ?? v.lines[1];

  return {
    id: v.id,
    date: v.date,
    journalNo: v.voucherNumber,
    referenceNo: v.referenceNo || "—",
    debitLedger: debitLine?.ledgerName?.trim() || "—",
    creditLedger: creditLine?.ledgerName?.trim() || "—",
    debitLedgerId: debitLine?.ledgerId ?? null,
    creditLedgerId: creditLine?.ledgerId ?? null,
    narration: v.narration?.trim() || "—",
    debitAmount: roundMoney(v.totalDebit),
    creditAmount: roundMoney(v.totalCredit),
    financialYearId: v.financialYearId,
  };
}

function isPostedJournal(v: AccountingVoucher): boolean {
  return v.status === "posted" || v.status === "approved";
}

export function buildJournalRegisterRows(): JournalRegisterRow[] {
  try {
    return getJournalVouchers()
      .filter(isPostedJournal)
      .map(voucherToRegisterRow)
      .sort((a, b) => {
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return dateCmp;
        return a.journalNo.localeCompare(b.journalNo);
      });
  } catch {
    return [];
  }
}

export function filterJournalRegisterRows(
  rows: JournalRegisterRow[],
  filters: JournalRegisterFilters,
): JournalRegisterRow[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  const ledgerQ = filters.ledgerSearch?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;

    if (ledgerQ) {
      const matchesLedger =
        row.debitLedger.toLowerCase().includes(ledgerQ) ||
        row.creditLedger.toLowerCase().includes(ledgerQ);
      if (!matchesLedger) return false;
    }

    if (q) {
      const haystack = [
        row.journalNo,
        row.referenceNo,
        row.debitLedger,
        row.creditLedger,
        row.narration,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

export function sortJournalRegisterRows(
  rows: JournalRegisterRow[],
  sortKey: JournalRegisterSortKey,
  sortDir: "asc" | "desc",
): JournalRegisterRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let cmp = 0;
    if (sortKey === "debitAmount" || sortKey === "creditAmount") {
      cmp = a[sortKey] - b[sortKey];
    } else {
      cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeJournalRegisterSummary(rows: JournalRegisterRow[]): JournalRegisterSummary {
  const totalDebit = roundMoney(rows.reduce((s, r) => s + r.debitAmount, 0));
  const totalCredit = roundMoney(rows.reduce((s, r) => s + r.creditAmount, 0));
  const difference = roundMoney(totalDebit - totalCredit);
  return {
    totalDebit,
    totalCredit,
    isBalanced: difference === 0,
    difference,
    count: rows.length,
  };
}

export function journalRegisterViewHref(row: JournalRegisterRow): string {
  return `/accounts/vouchers/view/${row.id}`;
}
