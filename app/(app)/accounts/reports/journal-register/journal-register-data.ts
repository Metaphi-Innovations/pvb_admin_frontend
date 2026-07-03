import type { AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import { getJournalVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
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

/** Static fallback rows — always shown without relying on localStorage. */
function computeStaticRows(): JournalRegisterRow[] {
  function daysAgoDate(n: number): string {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }

  const specs: Array<{
    daysAgo: number;
    journalNo: string;
    referenceNo: string;
    debitLedger: string;
    creditLedger: string;
    narration: string;
    amount: number;
  }> = [
    {
      daysAgo: 88,
      journalNo: "JV-2026-001",
      referenceNo: "REF-S001",
      debitLedger: "Salary Expense",
      creditLedger: "Salary Payable",
      narration: "Monthly salary provision – April",
      amount: 125000,
    },
    {
      daysAgo: 78,
      journalNo: "JV-2026-002",
      referenceNo: "REF-S002",
      debitLedger: "Rent Expense",
      creditLedger: "Outstanding Rent",
      narration: "Office rent provision – April",
      amount: 35000,
    },
    {
      daysAgo: 68,
      journalNo: "JV-2026-003",
      referenceNo: "REF-S003",
      debitLedger: "Depreciation",
      creditLedger: "Accumulated Depreciation",
      narration: "Monthly depreciation on fixed assets",
      amount: 18000,
    },
    {
      daysAgo: 60,
      journalNo: "JV-2026-004",
      referenceNo: "REF-S004",
      debitLedger: "Interest Expense",
      creditLedger: "Loan Account – HDFC",
      narration: "Interest accrued on term loan – May",
      amount: 12500,
    },
    {
      daysAgo: 55,
      journalNo: "JV-2026-005",
      referenceNo: "REF-S005",
      debitLedger: "Insurance Expense",
      creditLedger: "Outstanding Insurance",
      narration: "Fire & transit insurance premium amortization",
      amount: 8500,
    },
    {
      daysAgo: 48,
      journalNo: "JV-2026-006",
      referenceNo: "REF-S006",
      debitLedger: "Electricity Expense",
      creditLedger: "Electricity Payable",
      narration: "Monthly electricity bill provision – May",
      amount: 14200,
    },
    {
      daysAgo: 42,
      journalNo: "JV-2026-007",
      referenceNo: "REF-S007",
      debitLedger: "Professional Fees",
      creditLedger: "Professional Fees Payable",
      narration: "CA firm audit fees provision",
      amount: 25000,
    },
    {
      daysAgo: 35,
      journalNo: "JV-2026-008",
      referenceNo: "REF-S008",
      debitLedger: "Commission Expense",
      creditLedger: "Commission Payable",
      narration: "Field agent commission accrual – May",
      amount: 45000,
    },
    {
      daysAgo: 28,
      journalNo: "JV-2026-009",
      referenceNo: "REF-S009",
      debitLedger: "Bonus Expense",
      creditLedger: "Bonus Payable",
      narration: "Annual performance bonus provision",
      amount: 85000,
    },
    {
      daysAgo: 21,
      journalNo: "JV-2026-010",
      referenceNo: "REF-S010",
      debitLedger: "Statutory Dues",
      creditLedger: "PF Payable",
      narration: "PF employer contribution – June",
      amount: 18750,
    },
    {
      daysAgo: 14,
      journalNo: "JV-2026-011",
      referenceNo: "REF-S011",
      debitLedger: "ESI Expense",
      creditLedger: "ESI Payable",
      narration: "ESI employer contribution – June",
      amount: 6200,
    },
    {
      daysAgo: 7,
      journalNo: "JV-2026-012",
      referenceNo: "REF-S012",
      debitLedger: "Vehicle Maintenance",
      creditLedger: "Outstanding Expenses",
      narration: "Fleet servicing and maintenance – June",
      amount: 9500,
    },
    {
      daysAgo: 2,
      journalNo: "JV-2026-013",
      referenceNo: "REF-S013",
      debitLedger: "Bank Account – ICICI",
      creditLedger: "Interest Income",
      narration: "FD interest accrued – Q1 FY 2026-27",
      amount: 6800,
    },
    {
      daysAgo: 1,
      journalNo: "JV-2026-014",
      referenceNo: "REF-S014",
      debitLedger: "Bad Debts Expense",
      creditLedger: "Provision for Doubtful Debts",
      narration: "Provision on overdue receivables – June",
      amount: 15000,
    },
    {
      daysAgo: 0,
      journalNo: "JV-2026-015",
      referenceNo: "REF-S015",
      debitLedger: "Prepaid Rent",
      creditLedger: "Rent Expense",
      narration: "Prepaid rent amortization – July",
      amount: 12000,
    },
  ];

  return specs.map((s, i) => ({
    id: -(i + 1),
    date: daysAgoDate(s.daysAgo),
    journalNo: s.journalNo,
    referenceNo: s.referenceNo,
    debitLedger: s.debitLedger,
    creditLedger: s.creditLedger,
    debitLedgerId: null,
    creditLedgerId: null,
    narration: s.narration,
    debitAmount: s.amount,
    creditAmount: s.amount,
    financialYearId: null,
  }));
}

let _staticRows: JournalRegisterRow[] | null = null;

function getStaticRows(): JournalRegisterRow[] {
  if (!_staticRows) _staticRows = computeStaticRows();
  return _staticRows;
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
  const staticRows = getStaticRows();
  const staticNos = new Set(staticRows.map((r) => r.journalNo));

  let lsRows: JournalRegisterRow[] = [];
  try {
    ensureJournalRegisterDemoSeed();
    lsRows = getJournalVouchers()
      .filter(isPostedJournal)
      .map(voucherToRegisterRow)
      .filter((r) => !staticNos.has(r.journalNo));
  } catch {
    /* ignore localStorage errors on staging/SSR */
  }

  const all = [...staticRows, ...lsRows];
  all.sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.journalNo.localeCompare(b.journalNo);
  });
  return all;
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
  if (row.id < 0) return "#";
  return `/accounts/vouchers/view/${row.id}`;
}
