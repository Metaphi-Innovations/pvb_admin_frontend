/**
 * Bridge v2 bank reconciliation account IDs to COA bank ledgers.
 */

import { getBankReconAccountById } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  findDemoBankLedgerByBankName,
  getDemoBankLedgers,
} from "@/lib/accounts/bank-ledger-resolver";

const V2_LEDGER_MAP: Record<string, keyof ReturnType<typeof getDemoBankLedgers>> = {
  "hdfc-current": "hdfc",
  "icici-collection": "icici",
  "sbi-cash-credit": "sbi",
};

export function resolveCoaLedgerForV2BankAccount(bankAccountId: string): ChartOfAccount | null {
  const account = getBankReconAccountById(bankAccountId);
  if (!account) return null;

  const ledgers = getDemoBankLedgers();
  const key = V2_LEDGER_MAP[bankAccountId];
  if (key && ledgers[key]) return ledgers[key];

  const name = account.bankName.toLowerCase();
  if (name.includes("hdfc")) return ledgers.hdfc;
  if (name.includes("icici")) return ledgers.icici;
  if (name.includes("sbi") || name.includes("state bank")) return ledgers.sbi;
  if (name.includes("axis")) return ledgers.axis;
  if (name.includes("kotak")) return ledgers.kotak;

  return findDemoBankLedgerByBankName(account.bankName);
}
