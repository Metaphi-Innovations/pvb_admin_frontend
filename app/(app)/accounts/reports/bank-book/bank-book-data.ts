/**
 * Bank Book report — local data & statement builder.
 * Isolated to Accounts → Banking → Bank Book only.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import {
  loadVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  getBankAccountByLedgerId,
  loadBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { maskBankAccountLast4 } from "@/lib/accounts/bank-account-display";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";
import {
  applyMovement,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  sortChronological,
  toSignedBalance,
} from "@/lib/accounts/running-balance";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";

export const BANK_BOOK_VOUCHER_TYPES = [
  "Opening Balance",
  "Receipt Voucher",
  "Payment Voucher",
  "Contra Voucher",
  "Journal Voucher",
  "Fund Transfer",
] as const;

export type BankBookVoucherType = (typeof BANK_BOOK_VOUCHER_TYPES)[number];

export const BANK_BOOK_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  ...BANK_BOOK_VOUCHER_TYPES.filter((t) => t !== "Opening Balance").map((t) => ({
    value: t,
    label: t,
  })),
];

export type BankBookSortKey = "date" | "voucherNo" | "voucherType" | "receipt" | "payment";

export type BankBookRowKind = "opening" | "transaction";

export interface BankBookAccountOption {
  ledgerId: number;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  maskedAccountNumber: string;
  label: string;
}

export interface BankBookRawTransaction {
  voucherId: number;
  date: string;
  voucherNo: string;
  voucherTypeCode: VoucherTypeCode;
  voucherType: BankBookVoucherType;
  particular: string;
  narration: string;
  receipt: number;
  payment: number;
  lineOrder: number;
}

export interface BankBookDisplayRow {
  kind: BankBookRowKind;
  rowKey: string;
  voucherId: number | null;
  date: string;
  voucherNo: string;
  voucherType: BankBookVoucherType;
  particular: string;
  narration: string;
  receipt: number;
  payment: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  voucherHref: string | null;
}

export interface BankBookSummary {
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  maskedAccountNumber: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface BankBookStatement {
  summary: BankBookSummary;
  openingRow: BankBookDisplayRow;
  transactionRows: BankBookDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface BankBookFilters {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  voucherType: string;
  search: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BANK_MOVEMENT_VOUCHER_TYPES = new Set<VoucherTypeCode>([
  "receipt",
  "payment",
  "contra",
  "journal",
]);

export function formatBankBookDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${MONTHS[parseInt(m, 10) - 1]}-${y}`;
}

export function getBankBookAccountOptions(): BankBookAccountOption[] {
  return loadBankAccountMasters()
    .filter((m) => m.status === "active")
    .map((m) => ({
      ledgerId: m.coaLedgerId,
      bankName: m.bankName,
      accountNickname: m.accountNickname,
      accountNumber: m.accountNumber,
      maskedAccountNumber: maskBankAccountLast4(m.accountNumber),
      label: `${m.accountNickname} (${maskBankAccountLast4(m.accountNumber)})`,
    }));
}

export function getBankBookLedger(ledgerId: number): ChartOfAccount | null {
  const bankLedgers = getLedgersUnderSubGroupName("Bank Accounts");
  return bankLedgers.find((l) => l.id === ledgerId) ?? null;
}

export function resolveBankBookVoucherType(v: AccountingVoucher): BankBookVoucherType {
  const no = (v.voucherNumber || v.referenceNo || "").toUpperCase();
  const narration = (v.narration ?? "").toLowerCase();

  if (no.startsWith("FT-") || narration.includes("fund transfer")) {
    return "Fund Transfer";
  }

  switch (v.voucherType) {
    case "receipt":
      return "Receipt Voucher";
    case "payment":
      return "Payment Voucher";
    case "contra":
      return "Contra Voucher";
    case "journal":
      return "Journal Voucher";
    default:
      return "Journal Voucher";
  }
}

function resolveParticular(v: AccountingVoucher, bankLineIndex: number): string {
  const bankLine = v.lines[bankLineIndex];
  const otherLines = v.lines.filter(
    (line, index) =>
      index !== bankLineIndex &&
      line.ledgerId &&
      (Number(line.debit) > 0 || Number(line.credit) > 0),
  );

  if (otherLines.length === 1) {
    return otherLines[0].ledgerName || otherLines[0].remarks || "—";
  }

  if (otherLines.length > 1) {
    const names = otherLines.map((line) => line.ledgerName).filter(Boolean);
    if (names.length > 0) return names.join(", ");
  }

  return bankLine?.remarks || v.narration || "—";
}

function matchesSearch(row: BankBookRawTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.voucherNo, row.particular, row.narration, row.voucherType].some((value) =>
    value.toLowerCase().includes(q),
  );
}

function matchesFinancialYear(v: AccountingVoucher, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fyId = Number(financialYearId);
  if (!Number.isFinite(fyId)) return true;
  return v.financialYearId === fyId;
}

function buildRawTransactions(ledgerId: number): BankBookRawTransaction[] {
  const ledgerMap = new Map(loadChartOfAccounts().map((l) => [l.id, l]));
  const raw: BankBookRawTransaction[] = [];

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status))
    .filter((v) => BANK_MOVEMENT_VOUCHER_TYPES.has(v.voucherType))
    .forEach((v) => {
      const voucherType = resolveBankBookVoucherType(v);
      const voucherNo = statementVoucherNo(v);

      v.lines.forEach((line, lineOrder) => {
        if (line.ledgerId !== ledgerId) return;
        if (!ledgerMap.has(ledgerId)) return;

        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;

        raw.push({
          voucherId: v.id,
          date: v.date,
          voucherNo,
          voucherTypeCode: v.voucherType,
          voucherType,
          particular: resolveParticular(v, lineOrder),
          narration: v.narration || "—",
          receipt: debit,
          payment: credit,
          lineOrder,
        });
      });
    });

  return sortChronological(raw);
}

function computeOpeningAtDate(
  ledger: ChartOfAccount,
  allTransactions: BankBookRawTransaction[],
  dateFrom: string,
): { amount: number; balanceType: BalanceSide } {
  let signed = openingSignedBalance(ledger);

  for (const tx of allTransactions) {
    if (tx.date >= dateFrom) break;
    signed = applyMovement(signed, tx.receipt, tx.payment);
  }

  return fromSignedBalance(signed);
}

function buildSummary(
  master: BankAccountMaster | undefined,
  ledger: ChartOfAccount,
  periodOpening: { amount: number; balanceType: BalanceSide },
  transactionRows: BankBookDisplayRow[],
): BankBookSummary {
  let totalReceipts = 0;
  let totalPayments = 0;

  for (const row of transactionRows) {
    totalReceipts += row.receipt;
    totalPayments += row.payment;
  }

  const openingSigned = toSignedBalance(periodOpening.amount, periodOpening.balanceType);
  const closingSigned = applyMovement(
    openingSigned,
    totalReceipts,
    totalPayments,
  );
  const closing = fromSignedBalance(closingSigned);

  return {
    bankName: master?.bankName ?? ledger.accountName,
    accountNickname: master?.accountNickname ?? ledger.accountName,
    accountNumber: master?.accountNumber ?? "—",
    maskedAccountNumber: maskBankAccountLast4(master?.accountNumber ?? ""),
    openingBalance: periodOpening.amount,
    openingBalanceType: periodOpening.balanceType,
    totalReceipts: roundMoney(totalReceipts),
    totalPayments: roundMoney(totalPayments),
    closingBalance: closing.amount,
    closingBalanceType: closing.balanceType,
  };
}

function buildOpeningRow(
  dateFrom: string,
  opening: { amount: number; balanceType: BalanceSide },
): BankBookDisplayRow {
  return {
    kind: "opening",
    rowKey: "opening",
    voucherId: null,
    date: dateFrom,
    voucherNo: "—",
    voucherType: "Opening Balance",
    particular: "Balance brought forward",
    narration: "—",
    receipt: 0,
    payment: 0,
    runningBalance: opening.amount,
    runningBalanceType: opening.balanceType,
    voucherHref: null,
  };
}

function toDisplayRows(
  transactions: BankBookRawTransaction[],
  openingSigned: number,
): BankBookDisplayRow[] {
  let signed = openingSigned;

  return transactions.map((tx) => {
    signed = applyMovement(signed, tx.receipt, tx.payment);
    const balance = fromSignedBalance(signed);

    return {
      kind: "transaction",
      rowKey: `${tx.voucherId}-${tx.lineOrder}`,
      voucherId: tx.voucherId,
      date: tx.date,
      voucherNo: tx.voucherNo,
      voucherType: tx.voucherType,
      particular: tx.particular,
      narration: tx.narration,
      receipt: tx.receipt,
      payment: tx.payment,
      runningBalance: balance.amount,
      runningBalanceType: balance.balanceType,
      voucherHref: `/accounts/vouchers/view/${tx.voucherId}`,
    };
  });
}

export function buildBankBookStatement(
  bankLedgerId: number,
  filters: BankBookFilters,
): BankBookStatement | null {
  const ledger = getBankBookLedger(bankLedgerId);
  if (!ledger) return null;

  const master = getBankAccountByLedgerId(bankLedgerId);
  const allTransactions = buildRawTransactions(bankLedgerId).filter((tx) => {
    const voucher = loadVouchers().find((v) => v.id === tx.voucherId);
    if (!voucher) return false;
    return matchesFinancialYear(voucher, filters.financialYearId);
  });

  const periodOpening = computeOpeningAtDate(ledger, allTransactions, filters.dateFrom);

  const periodTransactions = allTransactions.filter(
    (tx) => tx.date >= filters.dateFrom && tx.date <= filters.dateTo,
  );

  const filteredTransactions = periodTransactions.filter((tx) => {
    if (filters.voucherType !== "all" && tx.voucherType !== filters.voucherType) return false;
    if (!matchesSearch(tx, filters.search)) return false;
    return true;
  });

  const openingSigned = toSignedBalance(periodOpening.amount, periodOpening.balanceType);
  const transactionRows = toDisplayRows(filteredTransactions, openingSigned);
  const summary = buildSummary(master, ledger, periodOpening, transactionRows);

  return {
    summary,
    openingRow: buildOpeningRow(filters.dateFrom, periodOpening),
    transactionRows,
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}

export function sortBankBookTransactions(
  rows: BankBookDisplayRow[],
  sortKey: BankBookSortKey,
  sortDir: "asc" | "desc",
  openingSigned: number,
): BankBookDisplayRow[] {
  const sorted = rows.slice().sort((a, b) => {
    let cmp = 0;

    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherType":
        cmp = a.voucherType.localeCompare(b.voucherType) || a.date.localeCompare(b.date);
        break;
      case "receipt":
        cmp = a.receipt - b.receipt || a.date.localeCompare(b.date);
        break;
      case "payment":
        cmp = a.payment - b.payment || a.date.localeCompare(b.date);
        break;
      default:
        cmp = 0;
    }

    return sortDir === "asc" ? cmp : -cmp;
  });

  let signed = openingSigned;
  return sorted.map((row) => {
    signed = applyMovement(signed, row.receipt, row.payment);
    const balance = fromSignedBalance(signed);
    return {
      ...row,
      runningBalance: balance.amount,
      runningBalanceType: balance.balanceType,
    };
  });
}
