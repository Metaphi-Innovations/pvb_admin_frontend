import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import { isPostedForReports } from "@/lib/accounts/accounts-maker-checker";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import { VOUCHER_TYPE_LABELS } from "@/app/(app)/accounts/masters/masters-data";
import { statementVoucherNo } from "@/lib/accounts/sales-invoice-accounting";
import { resolveSourceDocumentLink } from "@/lib/accounts/ledger-source-resolver";
import {
  buildCoaTransactionsForDateRange,
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementTotalsForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import {
  applyMovement,
  computeRunningBalances,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  sortChronological,
} from "@/lib/accounts/running-balance";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";

export interface CoaLedgerBalanceRow {
  id: number;
  name: string;
  balance: number;
  openingBalance: number;
}

export interface CoaTransactionRow {
  date: string;
  voucherNo: string;
  voucherType: string;
  referenceNo: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
  runningBalanceType: "Debit" | "Credit";
  isOpeningRow?: boolean;
  voucherId?: number;
  lineOrder?: number;
  viewHref?: string;
  viewLabel?: string;
}

export interface CoaGroupAccountingSummary {
  nodeId: number;
  nodeName: string;
  totalBalance: number;
  ledgerCount: number;
  monthDebit: number;
  monthCredit: number;
  ledgerRows: CoaLedgerBalanceRow[];
  recentTransactions: CoaTransactionRow[];
  ledgers: ChartOfAccount[];
}

export interface CoaLedgerAccountingSummary {
  ledgerId: number;
  ledgerName: string;
  openingBalance: number;
  openingBalanceType: "Debit" | "Credit";
  currentBalance: number;
  balanceType: "Debit" | "Credit";
  totalDebit: number;
  totalCredit: number;
  lastTransactionDate: string | null;
  transactions: CoaTransactionRow[];
}

function monthStart(): string {
  return new Date().toISOString().slice(0, 8) + "01";
}

export function collectDescendantLedgers(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  const ids = new Set<number>();
  const queue = [nodeId];
  while (queue.length) {
    const id = queue.shift()!;
    const children = records.filter((r) => r.parentAccountId === id);
    for (const c of children) {
      if (c.nodeLevel === "ledger") ids.add(c.id);
      else queue.push(c.id);
    }
  }
  return records.filter((r) => ids.has(r.id));
}

export function ledgerBalanceRows(ledgers: ChartOfAccount[]): CoaLedgerBalanceRow[] {
  return ledgers.map((l) => {
    const bal = computeLedgerCurrentBalance(l);
    return {
      id: l.id,
      name: l.accountName,
      balance: bal.amount,
      openingBalance: l.openingBalance,
    };
  });
}

export function sumLedgerBalances(ledgers: ChartOfAccount[]): number {
  return ledgers.reduce((s, l) => s + computeLedgerCurrentBalance(l).amount, 0);
}

export function collectLedgerRawCoaTransactions(
  ledger: ChartOfAccount,
): Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow">[] {
  const raw: Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow">[] = [];

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status))
    .forEach((v) => {
      v.lines.forEach((line, lineOrder) => {
        if (line.ledgerId !== ledger.id) return;
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;
        const source = resolveSourceDocumentLink(v);
        raw.push({
          date: v.date,
          voucherNo: statementVoucherNo(v),
          voucherType: VOUCHER_TYPE_LABELS[v.voucherType as keyof typeof VOUCHER_TYPE_LABELS] ?? v.voucherType,
          referenceNo: v.referenceNo?.trim() || "—",
          narration: line.remarks || v.narration || "—",
          debit,
          credit,
          voucherId: v.id,
          lineOrder,
          viewHref: source.href,
          viewLabel: source.label,
        });
      });
    });

  return sortChronological(raw);
}

export function buildLedgerTransactions(
  ledger: ChartOfAccount,
  limit = 30,
): CoaTransactionRow[] {
  const raw = collectLedgerRawCoaTransactions(ledger);
  const opening = { amount: ledger.openingBalance, balanceType: ledger.balanceType };
  const withBalances = computeRunningBalances(opening, raw);

  const rows: CoaTransactionRow[] = withBalances.map(({ row, runningBalance, runningBalanceType }) => ({
    ...row,
    runningBalance,
    runningBalanceType,
  }));

  return rows.reverse().slice(0, limit);
}

export function buildGroupTransactions(
  ledgerIds: Set<number>,
  _balanceType: "Debit" | "Credit" = "Debit",
  limit = 20,
): CoaTransactionRow[] {
  type RawGroupRow = Omit<
    CoaTransactionRow,
    "runningBalance" | "runningBalanceType" | "isOpeningRow"
  > & { ledgerId: number };

  const raw: RawGroupRow[] = [];
  const coaRecords = loadChartOfAccounts();
  const ledgerMap = new Map(
    coaRecords.filter((r) => ledgerIds.has(r.id)).map((l) => [l.id, l]),
  );

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status))
    .forEach((v) => {
      v.lines.forEach((line, lineOrder) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        const debit = Number(line.debit) || 0;
        const credit = Number(line.credit) || 0;
        if (debit === 0 && credit === 0) return;
        const source = resolveSourceDocumentLink(v);
        raw.push({
          date: v.date,
          voucherNo: statementVoucherNo(v),
          voucherType: VOUCHER_TYPE_LABELS[v.voucherType as keyof typeof VOUCHER_TYPE_LABELS] ?? v.voucherType,
          referenceNo: v.referenceNo?.trim() || "—",
          narration: line.remarks || v.narration || line.ledgerName || "—",
          debit,
          credit,
          voucherId: v.id,
          lineOrder,
          viewHref: source.href,
          viewLabel: source.label,
          ledgerId: line.ledgerId,
        });
      });
    });

  const sorted = sortChronological(raw);
  const runningByLedger = new Map<number, number>();
  for (const id of ledgerIds) {
    const ledger = ledgerMap.get(id);
    if (ledger) runningByLedger.set(id, openingSignedBalance(ledger));
  }

  const withBalances = sorted.map((row) => {
    const prior = runningByLedger.get(row.ledgerId) ?? 0;
    const signed = applyMovement(prior, row.debit, row.credit);
    runningByLedger.set(row.ledgerId, signed);
    const bal = fromSignedBalance(signed);
    const { ledgerId: _ledgerId, ...entry } = row;
    return {
      ...entry,
      runningBalance: bal.amount,
      runningBalanceType: bal.balanceType,
    };
  });

  return withBalances.reverse().slice(0, limit);
}

function sumMonthDebitCredit(ledgerIds: Set<number>): { debit: number; credit: number } {
  const start = monthStart();
  let debit = 0;
  let credit = 0;
  loadVouchers()
    .filter((v) => isPostedForReports(v.workflow, v.status))
    .filter((v) => v.date >= start)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        debit += Number(line.debit) || 0;
        credit += Number(line.credit) || 0;
      });
    });
  return { debit, credit };
}

function sumTotals(ledgerIds: Set<number>): { debit: number; credit: number } {
  let debit = 0;
  let credit = 0;
  loadVouchers()
    .filter((v) => isPostedForReports(v.workflow, v.status))
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId || !ledgerIds.has(line.ledgerId)) return;
        debit += Number(line.debit) || 0;
        credit += Number(line.credit) || 0;
      });
    });
  return { debit, credit };
}

export function inferAccountTypeFromPath(
  records: ChartOfAccount[],
  nodeId: number,
): AccountTypeLabel {
  const path = getAncestorPath(records, nodeId);
  const head = path.find((p) => p.nodeLevel === "primary_head");
  if (head?.accountName === "Assets") return "Asset";
  if (head?.accountName === "Liabilities") return "Liability";
  if (head?.accountName === "Income") return "Income";
  if (head?.accountName === "Expenses") return "Expense";
  return "Asset";
}

export type AccountTypeLabel = "Asset" | "Liability" | "Income" | "Expense";

export function buildGroupAccountingSummary(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaGroupAccountingSummary {
  const ledgers = collectDescendantLedgers(records, node.id);
  const ledgerIds = new Set(ledgers.map((l) => l.id));
  const { debit, credit } = sumMonthDebitCredit(ledgerIds);
  const accountType = inferAccountTypeFromPath(records, node.id);
  const defaultBalanceType: "Debit" | "Credit" =
    accountType === "Liability" || accountType === "Income" ? "Credit" : "Debit";

  return {
    nodeId: node.id,
    nodeName: node.accountName,
    totalBalance: sumLedgerBalances(ledgers),
    ledgerCount: ledgers.length,
    monthDebit: debit,
    monthCredit: credit,
    ledgerRows: ledgerBalanceRows(ledgers),
    recentTransactions: buildGroupTransactions(ledgerIds, defaultBalanceType),
    ledgers,
  };
}

export function buildLedgerAccountingSummary(
  ledger: ChartOfAccount,
  _records: ChartOfAccount[],
  dateFrom: string,
  dateTo: string,
): CoaLedgerAccountingSummary {
  const raw = collectLedgerRawCoaTransactions(ledger);
  const { totalDebit, totalCredit } = ledgerMovementTotalsForRange(raw, dateFrom, dateTo);
  const periodOpening = computePeriodOpeningBalance(ledger, raw, dateFrom);
  const periodClosing = computeClosingFromPeriodOpening(periodOpening, totalDebit, totalCredit);
  const lastTransactionDate =
    raw.length > 0 ? raw.reduce((max, row) => (row.date > max ? row.date : max), raw[0].date) : null;

  return {
    ledgerId: ledger.id,
    ledgerName: ledger.accountName,
    openingBalance: periodOpening.amount,
    openingBalanceType: periodOpening.balanceType,
    currentBalance: periodClosing.amount,
    balanceType: periodClosing.balanceType,
    totalDebit,
    totalCredit,
    lastTransactionDate,
    transactions: buildCoaTransactionsForDateRange(ledger, raw, dateFrom, dateTo, periodOpening),
  };
}

export function sumLedgersMatching(
  ledgers: ChartOfAccount[],
  predicate: (name: string) => boolean,
): number {
  return ledgers
    .filter((l) => predicate(l.accountName.toLowerCase()))
    .reduce((s, l) => s + computeLedgerCurrentBalance(l).amount, 0);
}
