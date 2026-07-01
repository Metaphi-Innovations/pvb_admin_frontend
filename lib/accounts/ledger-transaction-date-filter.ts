import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import type { LedgerTransactionRow } from "@/lib/accounts/ledger-detail-utils";
import { isDebitNatureLedger } from "@/lib/accounts/ledger-detail-utils";
import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";

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

function signedMovement(
  debit: number,
  credit: number,
  balanceType: "Debit" | "Credit",
): number {
  return balanceType === "Debit" ? debit - credit : credit - debit;
}

function signedOpening(amount: number, balanceType: "Debit" | "Credit"): number {
  return balanceType === "Debit" ? amount : -amount;
}

function toBalance(signed: number): { amount: number; balanceType: "Debit" | "Credit" } {
  if (signed >= 0) return { amount: signed, balanceType: "Debit" };
  return { amount: Math.abs(signed), balanceType: "Credit" };
}

/** Closing balance at period end from a known period opening and in-range movement. */
export function computeClosingFromPeriodOpening(
  periodOpening: { amount: number; balanceType: "Debit" | "Credit" },
  totalDebit: number,
  totalCredit: number,
  ledger: ChartOfAccount,
): { amount: number; balanceType: "Debit" | "Credit" } {
  const isDebitNature = isDebitNatureLedger(ledger);
  let running = periodOpening.amount;
  let runningType: "Debit" | "Credit" = periodOpening.balanceType;

  if (isDebitNature) {
    running += totalDebit - totalCredit;
    runningType = running >= 0 ? "Debit" : "Credit";
  } else {
    running += totalCredit - totalDebit;
    runningType = running >= 0 ? "Credit" : "Debit";
  }

  return { amount: Math.abs(running), balanceType: runningType };
}

/** Closing = ledger opening + net movement in the selected period (display only). */
export function computePeriodClosingBalance(
  ledger: ChartOfAccount,
  totalDebit: number,
  totalCredit: number,
): { amount: number; balanceType: "Debit" | "Credit" } {
  const signed =
    signedOpening(ledger.openingBalance, ledger.balanceType) +
    signedMovement(totalDebit, totalCredit, ledger.balanceType);
  return toBalance(signed);
}

/** Balance at the start of the selected period (after all pre-period postings). */
export function computePeriodOpeningBalance(
  ledger: ChartOfAccount,
  allTransactions: Pick<CoaTransactionRow, "date" | "debit" | "credit">[],
  from: string,
): { amount: number; balanceType: "Debit" | "Credit" } {
  const isDebitNature = isDebitNatureLedger(ledger);
  let running = ledger.openingBalance;
  let runningType: "Debit" | "Credit" = ledger.balanceType;

  for (const tx of allTransactions
    .filter((r) => r.date < from)
    .sort((a, b) => a.date.localeCompare(b.date))) {
    if (isDebitNature) {
      running += tx.debit - tx.credit;
      runningType = running >= 0 ? "Debit" : "Credit";
    } else {
      running += tx.credit - tx.debit;
      runningType = running >= 0 ? "Credit" : "Debit";
    }
  }

  return { amount: Math.abs(running), balanceType: runningType };
}

export function buildCoaTransactionsForDateRange(
  ledger: ChartOfAccount,
  allTransactions: Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow">[],
  from: string,
  to: string,
  periodOpening?: { amount: number; balanceType: "Debit" | "Credit" },
): CoaTransactionRow[] {
  const isDebitNature = isDebitNatureLedger(ledger);
  const opening =
    periodOpening ?? computePeriodOpeningBalance(ledger, allTransactions, from);

  const inRange = allTransactions
    .filter((r) => r.date >= from && r.date <= to)
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.voucherNo.localeCompare(b.voucherNo);
    });

  let running = opening.amount;
  let runningType: "Debit" | "Credit" = opening.balanceType;

  const rows: CoaTransactionRow[] = [
    {
      date: "—",
      voucherNo: "—",
      voucherType: "Opening Balance",
      referenceNo: "—",
      narration: "Balance brought forward",
      debit: opening.balanceType === "Debit" ? opening.amount : 0,
      credit: opening.balanceType === "Credit" ? opening.amount : 0,
      runningBalance: opening.amount,
      runningBalanceType: opening.balanceType,
      isOpeningRow: true,
    },
  ];

  for (const row of inRange) {
    if (isDebitNature) {
      running += row.debit - row.credit;
      runningType = running >= 0 ? "Debit" : "Credit";
    } else {
      running += row.credit - row.debit;
      runningType = running >= 0 ? "Credit" : "Debit";
    }
    rows.push({
      ...row,
      runningBalance: Math.abs(running),
      runningBalanceType: runningType,
    });
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
    .filter((v) => (v.status === "posted" || v.status === "approved") && v.date >= from && v.date <= to)
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
