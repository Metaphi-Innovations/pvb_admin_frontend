import type { AccountType } from "../data";

export interface CoaDemoLedgerSeed {
  subGroup: string;
  name: string;
  accountType: AccountType;
}

/**
 * Demo ledger entries — disabled.
 * Unlocked Level-4 demo / sample / placeholder ledgers are no longer seeded into COA.
 * System / locked ledgers come only from coa-seed-nodes.ts.
 * Bank Accounts, Sundry Debtors, and Sundry Creditors stay as groups (see coa-demo-bundle.ts).
 */
export const COA_DEMO_LEDGER_SEEDS: CoaDemoLedgerSeed[] = [];
