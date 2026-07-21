/**
 * Bridge v2 bank reconciliation account IDs to COA bank ledgers.
 * Uses repair-aware resolution so stale coaLedgerId links do not yield ₹0 book balances.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  ensureBankReconLedgerLinks,
  resolveReconCoaLedger,
} from "@/lib/accounts/bank-recon-ledger-link";
import { isFullyReconciledDemoAccount } from "@/lib/accounts/bank-recon-tally-fully-reconciled";

export function resolveCoaLedgerForV2BankAccount(bankAccountId: string): ChartOfAccount | null {
  if (typeof window === "undefined") return null;
  if (isFullyReconciledDemoAccount(bankAccountId)) return null;

  // One-shot repair — avoid calling heavy ensure on every row resolve.
  ensureBankReconLedgerLinks();
  return resolveReconCoaLedger(bankAccountId);
}
