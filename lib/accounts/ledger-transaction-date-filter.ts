import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { LedgerTransactionRow } from "@/lib/accounts/ledger-detail-utils";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import {
  computeRunningBalances,
  fromSignedBalance,
  isLedgerMovementVoucherStatus,
  openingSignedBalance,
  signedBalanceAfterMovements,
  sortChronological,
  toSignedBalance,
  type BalanceAmount,
  type ChronologicalSortable,
} from "@/lib/accounts/running-balance";

type CoaMovementRow = Omit<
  CoaTransactionRow,
  "runningBalance" | "runningBalanceType" | "isOpeningRow"
> &
  ChronologicalSortable;

export interface LedgerDateRange {
  from: string;
  to: string;
}

export interface LedgerDateRangeState extends LedgerDateRange {
  preset: DateRangePresetId;
}

function parseFyStartYear(fyId: string): number {
  return parseInt(fyId.split("-")[0], 10);
}

/** Indian FY: Apr 1 – Mar 31 */
export function financialYearIsoRange(fyId: string): LedgerDateRange {
  const y = parseFyStartYear(fyId);
  return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
}

/** Default ledger transaction view: selected FY from Apr 1 through today (capped at FY end). */
export function resolveLedgerDefaultDateRange(
  fyId: string,
  today = new Date().toISOString().slice(0, 10),
): LedgerDateRange {
  const fy = financialYearIsoRange(fyId);
  const to = today < fy.to ? today : fy.to;
  return { from: fy.from, to: to < fy.from ? fy.from : to };
}

export function defaultLedgerDateRangeState(fyId: string): LedgerDateRangeState {
  const { from, to } = resolveLedgerDefaultDateRange(fyId);
  return { preset: "custom", from, to };
}

export function resolvePresetDateRange(
  preset: DateRangePresetId,
  custom: LedgerDateRange,
  refDate = new Date(),
): LedgerDateRange {
  if (preset === "custom") return custom;
  return resolveDateRangePreset(preset, refDate);
}

export function transactionsInDateRange<T extends { date: string }>(
  rows: T[],
  from: string,
  to: string,
): T[] {
  return rows.filter((r) => r.date >= from && r.date <= to);
}

export function ledgerMovementTotalsForRange(
  transactions: Pick<LedgerTransactionRow, "debit" | "credit" | "date">[],
  from: string,
  to: string,
): { totalDebit: number; totalCredit: number } {
  return transactionsInDateRange(transactions, from, to).reduce(
    (acc, tx) => ({
      totalDebit: acc.totalDebit + tx.debit,
      totalCredit: acc.totalCredit + tx.credit,
    }),
    { totalDebit: 0, totalCredit: 0 },
  );
}

/** Closing balance at period end from a known period opening and in-range movement. */
export function computeClosingFromPeriodOpening(
  periodOpening: BalanceAmount,
  totalDebit: number,
  totalCredit: number,
): BalanceAmount {
  const signed =
    toSignedBalance(periodOpening.amount, periodOpening.balanceType) + totalDebit - totalCredit;
  return fromSignedBalance(signed);
}

/** Closing = ledger opening + net movement in the selected period (display only). */
export function computePeriodClosingBalance(
  ledger: ChartOfAccount,
  totalDebit: number,
  totalCredit: number,
): BalanceAmount {
  const signed = openingSignedBalance(ledger) + totalDebit - totalCredit;
  return fromSignedBalance(signed);
}

/** Balance at the start of the selected period (after all pre-period postings). */
export function computePeriodOpeningBalance(
  ledger: ChartOfAccount,
  allTransactions: CoaMovementRow[],
  from: string,
): BalanceAmount {
  const prior = sortChronological(allTransactions.filter((r) => r.date < from));
  const signed = signedBalanceAfterMovements(openingSignedBalance(ledger), prior);
  return fromSignedBalance(signed);
}

export function buildCoaTransactionsForDateRange(
  ledger: ChartOfAccount,
  allTransactions: CoaMovementRow[],
  from: string,
  to: string,
  periodOpening?: BalanceAmount,
): CoaTransactionRow[] {
  const opening = periodOpening ?? computePeriodOpeningBalance(ledger, allTransactions, from);
  const inRange = sortChronological(
    allTransactions.filter((r) => r.date >= from && r.date <= to),
  );
  const withBalances = computeRunningBalances(opening, inRange);

  const rows: CoaTransactionRow[] = [
    {
      date: "—",
      voucherNo: "—",
      voucherType: "Opening Balance",
      referenceNo: "—",
      narration: "Opening Balance",
      debit: opening.balanceType === "Debit" ? opening.amount : 0,
      credit: opening.balanceType === "Credit" ? opening.amount : 0,
      runningBalance: opening.amount,
      runningBalanceType: opening.balanceType,
      isOpeningRow: true,
    },
  ];

  for (const { row, runningBalance, runningBalanceType } of withBalances) {
    rows.push({
      ...row,
      runningBalance,
      runningBalanceType,
    } as CoaTransactionRow);
  }

  return rows;
}

/** Single-pass voucher scan: period debit/credit per ledger for listing views. */
export function ledgerMovementMapForRange(
  from: string,
  to: string,
): Map<number, { totalDebit: number; totalCredit: number }> {
  const map = new Map<number, { totalDebit: number; totalCredit: number }>();

  loadVouchers()
    .filter((v) => isLedgerMovementVoucherStatus(v.status) && v.date >= from && v.date <= to)
    .forEach((v) => {
      v.lines.forEach((line) => {
        if (!line.ledgerId) return;
        const cur = map.get(line.ledgerId) ?? { totalDebit: 0, totalCredit: 0 };
        cur.totalDebit += Number(line.debit) || 0;
        cur.totalCredit += Number(line.credit) || 0;
        map.set(line.ledgerId, cur);
      });
    });

  return map;
}
