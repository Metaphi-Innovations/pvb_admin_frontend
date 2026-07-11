/**
 * General Ledger demo seed — ensures COA posting ledger transactions exist.
 */

import { ensureCoaPostingLedgerTransactionsOnPageLoad } from "@/lib/accounts/coa-ledger-transactions-seed";

export const GENERAL_LEDGER_DEMO_SEED_VERSION = "exact-2-repair-v1";
const VERSION_KEY = "ds_general_ledger_demo_seed_version";

export function seedGeneralLedgerDemoData(_force = false): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
}

export function ensureGeneralLedgerDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureCoaPostingLedgerTransactionsOnPageLoad();
  if (localStorage.getItem(VERSION_KEY) !== GENERAL_LEDGER_DEMO_SEED_VERSION) {
    localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
  }
}

export function scheduleGeneralLedgerDemoOnPageLoad(): void {
  void import("@/lib/accounts/deferred-demo-seed").then(({ scheduleDeferredDemoSeed }) => {
    scheduleDeferredDemoSeed("general-ledger-demo", ensureGeneralLedgerDemoOnPageLoad);
  });
}
