/**
 * Shared COA ledger statement row type (API-backed detail table / export).
 */

import type { CoaTransactionRow } from "@/lib/accounts/coa-accounting-view";

export interface CoaLedgerDetailRow extends CoaTransactionRow {
  partyName?: string;
}
