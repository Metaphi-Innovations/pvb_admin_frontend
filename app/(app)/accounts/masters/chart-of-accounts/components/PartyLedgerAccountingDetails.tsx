"use client";

/**
 * Re-export from shared component for existing COA imports.
 * Prefer `@/components/accounts/PartyMasterAccountingFields` for new code.
 */

export {
  PartyMasterAccountingFields,
  PartyLedgerAccountingDetails,
  parseOpeningBalanceAmount,
  partyAccountingFromMaster,
  DEFAULT_PARTY_MASTER_ACCOUNTING,
  type PartyMasterAccountingValues,
  type PartyLedgerAccountingValues,
} from "@/components/accounts/PartyMasterAccountingFields";
