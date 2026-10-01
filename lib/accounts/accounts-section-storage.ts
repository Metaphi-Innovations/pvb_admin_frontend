/**
 * Lightweight localStorage checks for accounts section demo seed — no heavy imports.
 */

import type { AccountsNavGroupId } from "./accounts-nav";

export const ACCOUNTS_DEMO_SEED_VERSION = "clean-coa-v7";
export const BANKING_DEMO_SEED_VERSION = "relative-dates-v3";
export const PAYABLES_PAGE_SEED_VERSION = "relative-dates-v3";

const CORE_SEED_KEY = "ds_accounts_core_seed";
const CORE_SEED_VERSION = "relative-dates-v4";
const COA_SECTION_KEY = "ds_accounts_coa_section_seed";
const TX_SECTION_KEY = "ds_accounts_transactions_section_seed";
const REPORTS_SECTION_KEY = "ds_accounts_reports_section_seed";
const BANKING_SECTION_KEY = "ds_banking_demo_seed_version";
const PAYABLES_SECTION_KEY = "ds_payables_page_seed_version";
const RECEIVABLES_SECTION_KEY = "ds_receivables_demo_seed_v3";

/** True when persisted demo data for this nav group is already at the current version. */
export function isAccountsSectionStored(groupId: AccountsNavGroupId): boolean {
  if (typeof window === "undefined") return true;

  switch (groupId) {
    case "coa":
      return localStorage.getItem(COA_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION;
    case "transactions":
      return localStorage.getItem(TX_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION;
    case "receivables":
      return localStorage.getItem(RECEIVABLES_SECTION_KEY) === "relative-dates-v3";
    case "payables":
      return localStorage.getItem(PAYABLES_SECTION_KEY) === PAYABLES_PAGE_SEED_VERSION;
    case "banking":
      return localStorage.getItem(BANKING_SECTION_KEY) === BANKING_DEMO_SEED_VERSION;
    case "reports":
      return (
        localStorage.getItem(REPORTS_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION &&
        localStorage.getItem(TX_SECTION_KEY) === ACCOUNTS_DEMO_SEED_VERSION
      );
    default:
      return true;
  }
}

export function isAccountsCoreStored(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(CORE_SEED_KEY) === CORE_SEED_VERSION;
}
