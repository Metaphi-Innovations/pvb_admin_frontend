import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";

export const BANK_BOOK_VOUCHER_TYPES = [
  "Receipt Voucher",
  "Payment Voucher",
  "Contra Voucher",
  "Journal Voucher",
  "Sales Collection",
  "Vendor Payment",
  "Fund Transfer",
  "Bank Charges",
  "Interest Credit",
] as const;

export type BankBookVoucherTypeLabel = (typeof BANK_BOOK_VOUCHER_TYPES)[number];

export interface BookEntryRow {
  rowKey: string;
  voucherId: number;
  date: string;
  voucherNo: string;
  voucherType: VoucherTypeCode;
  voucherTypeLabel: BankBookVoucherTypeLabel;
  particulars: string;
  receipt: number;
  payment: number;
  runningBalance: number;
  ledgerId: number;
  ledgerName: string;
  branch?: string;
}

export interface BookSummary {
  openingBalance: number;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
}

export interface BookFilterParams {
  ledgerIds?: number[];
  dateFrom?: string;
  dateTo?: string;
  voucherTypeLabel?: string;
  search?: string;
  branch?: string;
}

function signedMovement(debit: number, credit: number, balanceType: "Debit" | "Credit"): number {
  return balanceType === "Debit" ? debit - credit : credit - debit;
}

export function resolveBankBookVoucherTypeLabel(v: AccountingVoucher): BankBookVoucherTypeLabel {
  const ref = (v.referenceNo ?? "").toUpperCase();
  const narration = (v.narration ?? "").toLowerCase();

  if (ref.startsWith("FT-") || narration.includes("fund transfer")) return "Fund Transfer";
  if (narration.includes("bank charge") || narration.includes("service charge")) return "Bank Charges";
  if (narration.includes("interest credit") || narration.includes("interest received")) return "Interest Credit";
  if (v.voucherType === "receipt") {
    if (narration.includes("collection") || narration.includes("sales") || narration.includes("customer")) {
      return "Sales Collection";
    }
    return "Receipt Voucher";
  }
  if (v.voucherType === "payment") {
    if (narration.includes("vendor") || narration.includes("supplier") || narration.includes("payable")) {
      return "Vendor Payment";
    }
    return "Payment Voucher";
  }
  if (v.voucherType === "contra") return "Fund Transfer";
  if (v.voucherType === "journal") return "Journal Voucher";
  return "Journal Voucher";
}

function ledgerBranch(ledger: ChartOfAccount): string {
  const name = ledger.accountName.toLowerCase();
  if (name.includes("branch") || name.includes("counter")) return "Branch";
  if (name.includes("field")) return "Field";
  if (name.includes("petty") || name.includes("office")) return "Head Office";
  return "Head Office";
}

function matchesSearch(row: BookEntryRow, q: string): boolean {
  const hay = `${row.voucherNo} ${row.particulars} ${row.voucherTypeLabel} ${row.ledgerName}`.toLowerCase();
  return hay.includes(q);
}

export function buildBookEntries(
  ledgers: ChartOfAccount[],
  filters: BookFilterParams = {},
): BookEntryRow[] {
  const ledgerMap = new Map(ledgers.map((l) => [l.id, l]));
  const allowedIds = filters.ledgerIds?.length
    ? new Set(filters.ledgerIds)
    : new Set(ledgers.map((l) => l.id));

  const raw: Omit<BookEntryRow, "runningBalance">[] = [];

  loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .forEach((v) => {
      if (filters.dateFrom && v.date < filters.dateFrom) return;
      if (filters.dateTo && v.date > filters.dateTo) return;

      const label = resolveBankBookVoucherTypeLabel(v);
      if (filters.voucherTypeLabel && label !== filters.voucherTypeLabel) return;

      v.lines.forEach((line, idx) => {
        if (!line.ledgerId || !allowedIds.has(line.ledgerId)) return;
        const ledger = ledgerMap.get(line.ledgerId);
        if (!ledger) return;

        const branch = ledgerBranch(ledger);
        if (filters.branch && filters.branch !== "all" && branch !== filters.branch) return;

        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;

        const row: Omit<BookEntryRow, "runningBalance"> = {
          rowKey: `${v.id}-${line.id ?? idx}`,
          voucherId: v.id,
          date: v.date,
          voucherNo: statementVoucherNo(v),
          voucherType: v.voucherType,
          voucherTypeLabel: label,
          particulars: line.remarks || v.narration || "—",
          receipt: debit,
          payment: credit,
          ledgerId: ledger.id,
          ledgerName: ledger.accountName,
          branch,
        };

        if (filters.search?.trim() && !matchesSearch({ ...row, runningBalance: 0 }, filters.search.trim().toLowerCase())) {
          return;
        }
        raw.push(row);
      });
    });

  raw.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.voucherNo.localeCompare(b.voucherNo);
  });

  const openingByLedger = new Map<number, number>();
  for (const l of ledgers) {
    if (allowedIds.has(l.id)) openingByLedger.set(l.id, l.openingBalance);
  }

  let running = [...openingByLedger.values()].reduce((s, v) => s + v, 0);
  return raw.map((row) => {
    const ledger = ledgerMap.get(row.ledgerId)!;
    running += signedMovement(row.receipt, row.payment, ledger.balanceType);
    return { ...row, runningBalance: running };
  });
}

export function computeBookSummary(
  ledgers: ChartOfAccount[],
  entries: BookEntryRow[],
  filters: BookFilterParams = {},
): BookSummary {
  const allowedIds = filters.ledgerIds?.length
    ? new Set(filters.ledgerIds)
    : new Set(ledgers.map((l) => l.id));

  const scopedLedgers = ledgers.filter((l) => allowedIds.has(l.id));
  const openingBalance = scopedLedgers.reduce((s, l) => s + l.openingBalance, 0);

  let totalReceipts = 0;
  let totalPayments = 0;
  for (const e of entries) {
    totalReceipts += e.receipt;
    totalPayments += e.payment;
  }

  const netMovement = scopedLedgers.reduce((s, l) => {
    const ledgerEntries = entries.filter((e) => e.ledgerId === l.id);
    const movement = ledgerEntries.reduce(
      (m, e) => m + signedMovement(e.receipt, e.payment, l.balanceType),
      0,
    );
    return s + movement;
  }, 0);

  return {
    openingBalance,
    totalReceipts,
    totalPayments,
    closingBalance: openingBalance + netMovement,
  };
}

export function getBankBookLedgers(): ChartOfAccount[] {
  const bankLedgers = getLedgersUnderSubGroupName("Bank Accounts");
  const masters = loadBankAccountMasters();
  if (masters.length === 0) return bankLedgers;
  const masterLedgerIds = new Set(masters.filter((m) => m.status === "active").map((m) => m.coaLedgerId));
  return bankLedgers.filter((l) => masterLedgerIds.has(l.id));
}

export function getCashBookLedgers(): ChartOfAccount[] {
  return getLedgersUnderSubGroupName("Cash-in-Hand");
}

export function listBankAccountFilterOptions(): { id: number; label: string }[] {
  return loadBankAccountMasters()
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.coaLedgerId,
      label: `${m.accountNickname} (${m.accountNumber})`,
    }));
}

export const CASH_BRANCH_OPTIONS = ["all", "Head Office", "Branch", "Field"] as const;
