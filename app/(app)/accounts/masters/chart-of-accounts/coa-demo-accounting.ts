/**
 * COA ledger detail accounting — merges bundled demo transactions with posted vouchers.
 */

import type { ChartOfAccount } from "../../data";
import type { CoaLedgerAccountingSummary, CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";
import { collectLedgerRawCoaTransactions } from "@/lib/accounts/coa-accounting-view";
import {
  buildCoaTransactionsForDateRange,
  computeClosingFromPeriodOpening,
  computePeriodOpeningBalance,
  ledgerMovementTotalsForRange,
} from "@/lib/accounts/ledger-transaction-date-filter";
import { sortChronological } from "@/lib/accounts/running-balance";
import {
  getBundledDemoTransactions,
  isBundledDemoLedger,
  type CoaDemoTransactionSeed,
} from "./coa-demo-transactions";

export interface CoaLedgerDetailRow extends CoaTransactionRow {
  partyName?: string;
}

function demoSeedToRawRow(
  seed: CoaDemoTransactionSeed,
): Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow"> & {
  partyName: string;
} {
  return {
    date: seed.date,
    voucherNo: seed.voucherNo,
    voucherType: seed.voucherType,
    referenceNo: seed.voucherNo,
    narration: seed.particulars,
    partyName: seed.partyName,
    debit: seed.debit,
    credit: seed.credit,
  };
}

function mergeLedgerTransactionSources(
  ledger: ChartOfAccount,
): Array<
  Omit<CoaTransactionRow, "runningBalance" | "runningBalanceType" | "isOpeningRow"> & {
    partyName?: string;
  }
> {
  const voucherRows = collectLedgerRawCoaTransactions(ledger);
  const bundledRows = getBundledDemoTransactions(ledger.id).map(demoSeedToRawRow);

  if (voucherRows.length === 0) {
    return bundledRows;
  }

  if (!isBundledDemoLedger(ledger)) {
    return voucherRows;
  }

  const voucherNos = new Set(voucherRows.map((r) => r.voucherNo));
  const supplemental = bundledRows.filter((r) => !voucherNos.has(r.voucherNo));
  return sortChronological([...voucherRows, ...supplemental]);
}

/** Build ledger summary + transactions for the COA detail panel (always includes bundled demo data). */
export function buildCoaLedgerDetailSummary(
  ledger: ChartOfAccount,
  _records: ChartOfAccount[],
  dateFrom: string,
  dateTo: string,
): CoaLedgerAccountingSummary & { transactions: CoaLedgerDetailRow[] } {
  const raw = mergeLedgerTransactionSources(ledger);
  const normalizedRaw = raw.map(({ partyName: _party, ...row }) => row);
  const { totalDebit, totalCredit } = ledgerMovementTotalsForRange(normalizedRaw, dateFrom, dateTo);
  const periodOpening = computePeriodOpeningBalance(ledger, normalizedRaw, dateFrom);
  const periodClosing = computeClosingFromPeriodOpening(periodOpening, totalDebit, totalCredit);
  const lastTransactionDate =
    raw.length > 0 ? raw.reduce((max, row) => (row.date > max ? row.date : max), raw[0].date) : null;

  const periodRows = buildCoaTransactionsForDateRange(
    ledger,
    normalizedRaw,
    dateFrom,
    dateTo,
    periodOpening,
  );

  const partyByKey = new Map(
    raw.map((r) => [`${r.date}|${r.voucherNo}|${r.debit}|${r.credit}`, r.partyName]),
  );

  const transactions: CoaLedgerDetailRow[] = periodRows.map((row) => ({
    ...row,
    partyName: partyByKey.get(`${row.date}|${row.voucherNo}|${row.debit}|${row.credit}`),
  }));

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
    transactions,
  };
}
