/**
 * General Ledger demo seed — COA postings + scenario vouchers for GL testing.
 */

import { ensureCoaPostingLedgerTransactionsOnPageLoad } from "@/lib/accounts/coa-ledger-transactions-seed";
import { ensureGeneralLedgerScenariosOnPageLoad } from "@/lib/accounts/general-ledger-seed";

export const GENERAL_LEDGER_DEMO_SEED_VERSION = "gl-scenarios-v1";
const VERSION_KEY = "ds_general_ledger_demo_seed_version";

export function seedGeneralLedgerDemoData(_force = false): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  ensureGeneralLedgerScenariosOnPageLoad();
  localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
}

export function ensureGeneralLedgerDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  ensureGeneralLedgerScenariosOnPageLoad();
  if (localStorage.getItem(VERSION_KEY) !== GENERAL_LEDGER_DEMO_SEED_VERSION) {
    localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
  }
}

export function scheduleGeneralLedgerDemoOnPageLoad(): void {
  void import("@/lib/accounts/deferred-demo-seed").then(({ scheduleDeferredDemoSeed }) => {
    scheduleDeferredDemoSeed("general-ledger-demo", ensureGeneralLedgerDemoOnPageLoad);
  });
}
