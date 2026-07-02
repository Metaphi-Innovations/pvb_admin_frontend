/**
 * Cash Book report — local data & statement builder.
 * Isolated to Accounts → Reports → Cash Book only.
 * Transactions are derived from posted accounting vouchers (no standalone cash entries).
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  loadVouchers,
  type AccountingVoucher,
  type VoucherTypeCode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import {
  applyMovement,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  sortChronological,
  toSignedBalance,
} from "@/lib/accounts/running-balance";
import { roundMoney, type BalanceSide } from "@/lib/accounts/money-format";

export const CASH_BOOK_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "opening", label: "Opening Balance" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "contra", label: "Contra Voucher" },
  { value: "journal", label: "Journal Voucher" },
];

export const CASH_BOOK_VOUCHER_TYPE_LABELS: Record<string, string> = {
  opening: "Opening Balance",
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  contra: "Contra Voucher",
  journal: "Journal Voucher",
};

const CASH_VOUCHER_TYPES = new Set<VoucherTypeCode>(["receipt", "payment", "contra", "journal"]);

export type CashBookRowKind = "opening" | "transaction";

export type CashBookSortKey = "date" | "voucherNo" | "voucherType" | "receipt" | "payment";

export interface CashBookLedgerOption {
  id: string;
  ledgerId: number;
  ledgerName: string;
  ledgerCode: string;
}

export interface CashBookRawTransaction {
  id: string;
  voucherId: number;
  date: string;
  voucherNo: string;
  voucherTypeCode: VoucherTypeCode;
  voucherType: string;
  particular: string;
  narration: string;
  receipt: number;
  payment: number;
  lineOrder: number;
}

export interface CashBookDisplayRow {
  kind: CashBookRowKind;
  id: string;
  date: string;
  voucherNo: string;
  voucherType: string;
  voucherTypeCode: VoucherTypeCode | "opening";
  particular: string;
  narration: string;
  receipt: number;
  payment: number;
  runningBalance: number;
  runningBalanceType: BalanceSide;
  voucherHref: string | null;
}

export interface CashBookSummary {
  ledgerId: number;
  ledgerName: string;
  ledgerCode: string;
  openingBalance: number;
  openingBalanceType: BalanceSide;
  totalReceipts: number;
  totalPayments: number;
  closingBalance: number;
  closingBalanceType: BalanceSide;
}

export interface CashBookStatement {
  summary: CashBookSummary;
  transactionRows: CashBookDisplayRow[];
  displayRows: CashBookDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface CashBookFilters {
  dateFrom: string;
  dateTo: string;
  voucherType: string;
  search: string;
}

export function getCashBookLedgers(): CashBookLedgerOption[] {
  return getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => ({
    id: String(l.id),
    ledgerId: l.id,
    ledgerName: l.accountName,
    ledgerCode: l.accountCode,
  }));
}

export function getCashBookLedgerById(ledgerId: string): CashBookLedgerOption | null {
  return getCashBookLedgers().find((l) => l.id === ledgerId) ?? null;
}

function resolveVoucherTypeLabel(voucherType: VoucherTypeCode): string {
  return CASH_BOOK_VOUCHER_TYPE_LABELS[voucherType] ?? voucherType;
}

function resolveParticular(v: AccountingVoucher, cashLedgerId: number, cashLineIndex: number): string {
  const other = v.lines.find((line, idx) => idx !== cashLineIndex && line.ledgerId !== cashLedgerId);
  if (other?.ledgerName) return other.ledgerName;
  if (other?.remarks?.trim()) return other.remarks.trim();
  const cashLine = v.lines[cashLineIndex];
  if (cashLine?.remarks?.trim()) return cashLine.remarks.trim();
  return "—";
}

function extractCashTransactions(ledgerId: number): CashBookRawTransaction[] {
  const cashLedgerIds = new Set(getLedgersUnderSubGroupName("Cash-in-Hand").map((l) => l.id));
  const raw: CashBookRawTransaction[] = [];

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status))
    .filter((v) => CASH_VOUCHER_TYPES.has(v.voucherType))
    .forEach((v) => {
      v.lines.forEach((line, lineOrder) => {
        if (!line.ledgerId || line.ledgerId !== ledgerId || !cashLedgerIds.has(line.ledgerId)) return;

        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;

        raw.push({
          id: `${v.id}-${line.id ?? lineOrder}`,
          voucherId: v.id,
          date: v.date,
          voucherNo: statementVoucherNo(v),
          voucherTypeCode: v.voucherType,
          voucherType: resolveVoucherTypeLabel(v.voucherType),
          particular: resolveParticular(v, ledgerId, lineOrder),
          narration: v.narration?.trim() || "—",
          receipt: debit,
          payment: credit,
          lineOrder,
        });
      });
    });

  return sortChronological(raw);
}

function matchesSearch(row: CashBookRawTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [row.voucherNo, row.voucherType, row.particular, row.narration].some((v) =>
    v.toLowerCase().includes(q),
  );
}

function computeOpeningAtDate(
  ledger: ChartOfAccount,
  allTransactions: CashBookRawTransaction[],
  dateFrom: string,
): { amount: number; balanceType: BalanceSide } {
  let signed = openingSignedBalance(ledger);

  for (const tx of allTransactions) {
    if (tx.date >= dateFrom) break;
    signed = applyMovement(signed, tx.receipt, tx.payment);
  }

  return fromSignedBalance(signed);
}

export function sortCashBookTransactions(
  rows: CashBookDisplayRow[],
  sortKey: CashBookSortKey,
  sortDir: "asc" | "desc",
): CashBookDisplayRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "voucherNo":
        cmp = a.voucherNo.localeCompare(b.voucherNo);
        break;
      case "voucherType":
        cmp = a.voucherType.localeCompare(b.voucherType);
        break;
      case "receipt":
        cmp = a.receipt - b.receipt;
        break;
      case "payment":
        cmp = a.payment - b.payment;
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function buildCashBookStatement(
  ledgerId: string,
  filters: CashBookFilters,
): CashBookStatement | null {
  const option = getCashBookLedgerById(ledgerId);
  if (!option) return null;

  const ledger =
    loadChartOfAccounts().find((r) => r.id === option.ledgerId && r.nodeLevel === "ledger") ?? null;
  if (!ledger) return null;

  const allTransactions = extractCashTransactions(option.ledgerId);
  const periodOpening = computeOpeningAtDate(ledger, allTransactions, filters.dateFrom);

  const periodTransactions = allTransactions.filter(
    (t) => t.date >= filters.dateFrom && t.date <= filters.dateTo,
  );

  const filteredTransactions = periodTransactions.filter((t) => {
    if (filters.voucherType !== "all" && t.voucherTypeCode !== filters.voucherType) return false;
    return matchesSearch(t, filters.search);
  });

  let signedRunning = toSignedBalance(periodOpening.amount, periodOpening.balanceType);
  const transactionRows: CashBookDisplayRow[] = filteredTransactions.map((t) => {
    signedRunning = applyMovement(signedRunning, t.receipt, t.payment);
    const bal = fromSignedBalance(signedRunning);
    return {
      kind: "transaction",
      id: t.id,
      date: t.date,
      voucherNo: t.voucherNo,
      voucherType: t.voucherType,
      voucherTypeCode: t.voucherTypeCode,
      particular: t.particular,
      narration: t.narration,
      receipt: t.receipt,
      payment: t.payment,
      runningBalance: bal.amount,
      runningBalanceType: bal.balanceType,
      voucherHref: `/accounts/vouchers/view/${t.voucherId}`,
    };
  });

  const movementForTotals = periodTransactions.filter((t) => {
    if (filters.voucherType !== "all" && t.voucherTypeCode !== filters.voucherType) return false;
    return matchesSearch(t, filters.search);
  });

  const totalReceipts = roundMoney(movementForTotals.reduce((s, t) => s + t.receipt, 0));
  const totalPayments = roundMoney(movementForTotals.reduce((s, t) => s + t.payment, 0));

  let signedClosing = toSignedBalance(periodOpening.amount, periodOpening.balanceType);
  for (const t of periodTransactions) {
    signedClosing = applyMovement(signedClosing, t.receipt, t.payment);
  }
  const closingBal = fromSignedBalance(signedClosing);

  const openingRow: CashBookDisplayRow = {
    kind: "opening",
    id: "opening",
    date: filters.dateFrom,
    voucherNo: "—",
    voucherType: "Opening Balance",
    voucherTypeCode: "opening",
    particular: "Opening Cash Balance",
    narration: "Balance brought forward",
    receipt: 0,
    payment: 0,
    runningBalance: periodOpening.amount,
    runningBalanceType: periodOpening.balanceType,
    voucherHref: null,
  };

  return {
    summary: {
      ledgerId: option.ledgerId,
      ledgerName: option.ledgerName,
      ledgerCode: option.ledgerCode,
      openingBalance: periodOpening.amount,
      openingBalanceType: periodOpening.balanceType,
      totalReceipts,
      totalPayments,
      closingBalance: closingBal.amount,
      closingBalanceType: closingBal.balanceType,
    },
    transactionRows,
    displayRows: [openingRow, ...transactionRows],
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}
