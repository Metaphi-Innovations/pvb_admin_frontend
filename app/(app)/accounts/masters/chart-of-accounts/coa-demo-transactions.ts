/**
 * @deprecated Demo transaction specs moved to lib/accounts/coa-ledger-transactions-seed.ts
 * Re-exports for any legacy imports.
 */
export {
  buildCoaLedgerTransactionSpecs as buildTransactionsForLedger,
  type CoaLedgerTxnSpec as CoaDemoTransactionSeed,
  seedCoaPostingLedgerTransactions,
  ensureCoaPostingLedgerTransactionsOnPageLoad,
  COA_LEDGER_TXN_SEED_VERSION,
} from "@/lib/accounts/coa-ledger-transactions-seed";

export { COA_DEMO_SOURCE_MODULE, isBundledCoaDemoLedger } from "./coa-demo-bundle";

import type { ChartOfAccount } from "../../data";
import { buildCoaLedgerTransactionSpecs } from "@/lib/accounts/coa-ledger-transactions-seed";

export function getBundledDemoTransactions(ledgerId: number) {
  return buildCoaLedgerTransactionSpecs({ id: ledgerId } as ChartOfAccount).map((row) => ({
    ...row,
    ledgerId,
  }));
}

export function isBundledDemoLedger(ledger: ChartOfAccount): boolean {
  return ledger.erpSourceModule === "coa_demo_bundle";
}

export function getBundledDemoTransactionCount(): number {
  return 0;
}
