import type { ChartOfAccount } from "@/app/(app)/accounts/data";

import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { primaryHeadLabelForLedger } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

import { loadVouchers, type AccountingVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";

import { computeCustomerOutstanding } from "@/lib/accounts/receivables-data";

import { computeVendorOutstanding } from "@/lib/accounts/payables-data";

import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";

import { resolveSourceDocumentLink } from "@/lib/accounts/ledger-source-resolver";
import {
  computeRunningBalances,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  signedBalanceAfterMovements,
  sortChronological,
  type BalanceAmount,
} from "@/lib/accounts/running-balance";

export { isDebitNatureLedger } from "@/lib/accounts/running-balance";

export type LedgerTypeLabel =
  | "Customer"
  | "Vendor"
  | "Bank"
  | "Cash"
  | "Sales"
  | "Purchase"
  | "Expense"
  | "GST"
  | "Employee Payable"
  | "Loan"
  | "Fixed Asset"
  | "Inventory"
  | "Income"
  | "General";

const VOUCHER_TYPE_LABELS: Record<string, string> = {
  sales: "Sales Invoice",
  purchase: "Purchase Bill",
  receipt: "Receipt Voucher",
  payment: "Payment Voucher",
  journal: "Journal Voucher",
  credit_note: "Credit Note",
  debit_note: "Debit Note",
  contra: "Contra Voucher",
};

export function resolveLedgerType(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
): LedgerTypeLabel {
  const path = getAncestorPath(records, ledger.id);
  const names = path.map((p) => p.accountName.toLowerCase()).join(" ");
  if (names.includes("trade receivables") || names.includes("sundry debtors")) return "Customer";
  if (names.includes("trade payables") || names.includes("sundry creditors")) return "Vendor";
  if (names.includes("bank accounts") || ledger.bankAccountFlag) return "Bank";
  if (names.includes("cash-in-hand") || names.includes("cash in hand")) return "Cash";
  if (names.includes("inventory") || names.includes("stock-in-hand")) return "Inventory";
  if (names.includes("income") && names.includes("sales")) return "Sales";
  if (names.includes("purchase") || names.includes("direct expenses")) return "Purchase";
  if (names.includes("expenses payable") || names.includes("employee")) return "Employee Payable";
  if (names.includes("duties") || names.includes("gst")) return "GST";
  if (names.includes("fixed assets") || names.includes("plant & machinery")) return "Fixed Asset";
  if (names.includes("loans") || names.includes("borrowings") || names.includes("secured loans")) return "Loan";
  if (ledger.accountType === "Expense") return "Expense";
  if (ledger.accountType === "Income") return "Income";
  return "General";
}

export function parentGroupLabel(records: ChartOfAccount[], ledger: ChartOfAccount): string {
  const path = getAncestorPath(records, ledger.id);
  const parent = path.length > 1 ? path[path.length - 2] : null;
  return parent?.accountName ?? "—";
}

export function primaryHeadForLedger(records: ChartOfAccount[], ledger: ChartOfAccount): string {
  return primaryHeadLabelForLedger(records, ledger);
}

export function ledgerOutstanding(ledger: ChartOfAccount): number {
  const records = loadChartOfAccounts();
  const type = resolveLedgerType(ledger, records);

  if (type === "Customer") {
    const balance = computeLedgerCurrentBalance(ledger);
    return balance.balanceType === "Debit" ? balance.amount : 0;
  }

  if (type === "Vendor") {
    const balance = computeLedgerCurrentBalance(ledger);
    return balance.balanceType === "Credit" ? balance.amount : 0;
  }

  const cust = computeCustomerOutstanding().find(
    (r) => r.ledgerId === ledger.id || r.customerName === ledger.accountName,
  );
  if (cust) return cust.outstanding;

  const vend = computeVendorOutstanding().find(
    (r) => r.ledgerId === ledger.id || r.vendorName === ledger.accountName,
  );
  if (vend) return vend.outstanding;

  return 0;
}

export interface LedgerTransactionRow {
  id: string;
  voucherId: number;
  date: string;
  voucherType: string;
  voucherNo: string;
  sourceModule: string;
  particulars: string;
  debit: number;
  credit: number;
  lineOrder?: number;
  href?: string;
  sourceHref?: string;
  sourceLabel?: string;
}

function voucherByIdMap(): Map<number, AccountingVoucher> {
  return new Map(
    loadVouchers()
      .filter((v) => isLedgerMovementVoucherStatus(v.status))
      .map((v) => [v.id, v]),
  );
}

/** Posted vouchers only — COA reflects accounting entries, not source documents. */
export function collectLedgerTransactions(ledgerId: number): LedgerTransactionRow[] {
  const rows: LedgerTransactionRow[] = [];

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status))
    .forEach((v: AccountingVoucher) => {
      const source = resolveSourceDocumentLink(v);
      v.lines.forEach((line, lineOrder) => {
        if (line.ledgerId !== ledgerId) return;
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;
        rows.push({
          id: `v-${v.id}-${line.id}`,
          voucherId: v.id,
          date: v.date,
          voucherType: VOUCHER_TYPE_LABELS[v.voucherType] ?? v.voucherType,
          voucherNo: statementVoucherNo(v),
          sourceModule: source.sourceModule,
          particulars: line.remarks || v.narration || line.ledgerName || "—",
          debit,
          credit,
          lineOrder,
          href: source.href,
          sourceHref: source.href,
          sourceLabel: source.label,
        });
      });
    });

  return sortChronological(rows).reverse();
}

export interface StatementRow {
  id?: string;
  date: string;
  voucherType: string;
  voucherNo: string;
  sourceModule: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: "Debit" | "Credit";
  href?: string;
  sourceHref?: string;
  sourceLabel?: string;
}

function openingStatementRow(opening: BalanceAmount): StatementRow {
  return {
    id: "opening",
    date: "—",
    voucherType: "Opening Balance",
    voucherNo: "—",
    sourceModule: "Opening Balance",
    particulars: "Opening Balance",
    debit: opening.balanceType === "Debit" ? opening.amount : 0,
    credit: opening.balanceType === "Credit" ? opening.amount : 0,
    runningBalance: opening.amount,
    balanceType: opening.balanceType,
  };
}

function transactionToStatementRow(
  tx: LedgerTransactionRow,
  running: BalanceAmount,
): StatementRow {
  return {
    id: tx.id,
    date: tx.date,
    voucherType: tx.voucherType,
    voucherNo: tx.voucherNo,
    sourceModule: tx.sourceModule,
    particulars: tx.particulars,
    debit: tx.debit,
    credit: tx.credit,
    runningBalance: running.amount,
    balanceType: running.balanceType,
    href: tx.href,
    sourceHref: tx.sourceHref,
    sourceLabel: tx.sourceLabel,
  };
}

export function buildLedgerStatement(
  ledger: ChartOfAccount,
  transactions: LedgerTransactionRow[],
): StatementRow[] {
  const opening: BalanceAmount = {
    amount: ledger.openingBalance,
    balanceType: ledger.balanceType,
  };
  const sorted = sortChronological(transactions);
  const withBalances = computeRunningBalances(opening, sorted);

  return [
    openingStatementRow(opening),
    ...withBalances.map(({ row, runningBalance, runningBalanceType }) =>
      transactionToStatementRow(row, { amount: runningBalance, balanceType: runningBalanceType }),
    ),
  ];
}

export function buildLedgerStatementForDateRange(
  ledger: ChartOfAccount,
  transactions: LedgerTransactionRow[],
  from: string,
  to: string,
): StatementRow[] {
  const prior = sortChronological(transactions.filter((t) => t.date < from));
  const periodOpening = fromSignedBalance(
    signedBalanceAfterMovements(openingSignedBalance(ledger), prior),
  );

  const inRange = sortChronological(transactions.filter((t) => t.date >= from && t.date <= to));
  const withBalances = computeRunningBalances(periodOpening, inRange);

  return [
    openingStatementRow(periodOpening),
    ...withBalances.map(({ row, runningBalance, runningBalanceType }) =>
      transactionToStatementRow(row, { amount: runningBalance, balanceType: runningBalanceType }),
    ),
  ];
}

export function ledgerMovementTotals(transactions: LedgerTransactionRow[]): {
  totalDebit: number;
  totalCredit: number;
} {
  return transactions.reduce(
    (acc, tx) => ({
      totalDebit: acc.totalDebit + tx.debit,
      totalCredit: acc.totalCredit + tx.credit,
    }),
    { totalDebit: 0, totalCredit: 0 },
  );
}

export function getLedgerById(id: number): ChartOfAccount | null {
  const records = loadChartOfAccounts();
  const node = records.find(
    (r) => r.id === id && r.nodeLevel === "ledger",
  );
  return node ?? null;
}

export function findVoucherForTransaction(voucherId: number): AccountingVoucher | undefined {
  return voucherByIdMap().get(voucherId);
}
