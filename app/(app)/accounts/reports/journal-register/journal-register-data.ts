import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { getJournalVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { roundMoney } from "@/lib/accounts/money-format";
import { ensureJournalRegisterDemoSeed } from "./journal-register-demo-seed";

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
  financialYearId?: number | "all";
  journalNo?: string;
  ledgerId?: string;
  search?: string;
}

export interface JournalRegisterSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  count: number;
}

export interface JournalRegisterLedgerOption {
  id: number;
  name: string;
}

export function formatJournalRegisterDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

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
  ensureJournalRegisterDemoSeed();
  return getJournalVouchers()
    .filter(isPostedJournal)
    .map(voucherToRegisterRow)
    .sort((a, b) => {
      const dateCmp = a.date.localeCompare(b.date);
      if (dateCmp !== 0) return dateCmp;
      return a.journalNo.localeCompare(b.journalNo);
    });
}

export function getJournalRegisterLedgerOptions(rows: JournalRegisterRow[]): JournalRegisterLedgerOption[] {
  const map = new Map<string, JournalRegisterLedgerOption>();
  let nextId = 1;

  for (const row of rows) {
    for (const name of [row.debitLedger, row.creditLedger]) {
      if (!name || name === "—" || map.has(name)) continue;
      map.set(name, { id: nextId++, name });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function rowInFinancialYear(row: JournalRegisterRow, financialYearId: number | "all"): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => y.id === financialYearId);
  if (!fy) return row.financialYearId === financialYearId;
  return row.date >= fy.startDate && row.date <= fy.endDate;
}

export function filterJournalRegisterRows(
  rows: JournalRegisterRow[],
  filters: JournalRegisterFilters,
): JournalRegisterRow[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  const journalQ = filters.journalNo?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (filters.financialYearId && !rowInFinancialYear(row, filters.financialYearId)) return false;

    if (journalQ && !row.journalNo.toLowerCase().includes(journalQ)) return false;

    if (filters.ledgerId && filters.ledgerId !== "all") {
      const ledgerId = Number(filters.ledgerId);
      const ledgerName =
        getJournalRegisterLedgerOptions(rows).find((l) => l.id === ledgerId)?.name ?? "";
      const matchesId =
        row.debitLedgerId === ledgerId ||
        row.creditLedgerId === ledgerId ||
        row.debitLedger === ledgerName ||
        row.creditLedger === ledgerName;
      if (!matchesId) return false;
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
