/**
 * COA ledger detail accounting — voucher lines only, filtered by ledgerId.
 */

import type { ChartOfAccount } from "../../data";
import type {
  CoaLedgerAccountingSummary,
  CoaTransactionRow,
} from "@/lib/accounts/coa-accounting-view";
import { buildLedgerAccountingSummary } from "@/lib/accounts/coa-accounting-view";

export interface CoaLedgerDetailRow extends CoaTransactionRow {
  partyName?: string;
}

/** Build ledger summary + transactions for the COA detail panel (posted voucher lines only). */
export function buildCoaLedgerDetailSummary(
  ledger: ChartOfAccount,
  records: ChartOfAccount[],
  dateFrom: string,
  dateTo: string,
): CoaLedgerAccountingSummary & { transactions: CoaLedgerDetailRow[] } {
  const summary = buildLedgerAccountingSummary(ledger, records, dateFrom, dateTo);
  return {
    ...summary,
    transactions: summary.transactions as CoaLedgerDetailRow[],
  };
}
