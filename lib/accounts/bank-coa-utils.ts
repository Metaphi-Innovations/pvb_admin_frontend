import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

export const BANK_ACCOUNTS_SUB_GROUP_NAME = "Bank Accounts";

export function getBankAccountsSubGroup(records: ChartOfAccount[]): ChartOfAccount | null {
  return (
    records.find(
      (r) => r.nodeLevel === "account_group" && r.accountName === BANK_ACCOUNTS_SUB_GROUP_NAME,
    ) ?? null
  );
}

export function isBankAccountsSubGroup(node: ChartOfAccount): boolean {
  return node.nodeLevel === "account_group" && node.accountName === BANK_ACCOUNTS_SUB_GROUP_NAME;
}

export function isBankGroupNode(node: ChartOfAccount): boolean {
  return node.nodeLevel === "ledger" && !!node.bankGroupFlag;
}

export function isBankAccountLedger(node: ChartOfAccount): boolean {
  return node.nodeLevel === "ledger" && !!node.bankAccountFlag && !node.bankGroupFlag;
}

export function isUnderBankAccounts(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return getAncestorPath(records, node.id).some((p) => isBankAccountsSubGroup(p));
}

export function canAddBankGroupUnder(node: ChartOfAccount): boolean {
  return isBankAccountsSubGroup(node);
}

export function canAddBankAccountLedgerUnder(node: ChartOfAccount): boolean {
  return isBankGroupNode(node);
}

export function getBankGroups(records: ChartOfAccount[]): ChartOfAccount[] {
  const sub = getBankAccountsSubGroup(records);
  if (!sub) return [];
  return records
    .filter((r) => r.parentAccountId === sub.id && isBankGroupNode(r))
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

export function getBankAccountLedgersUnderGroup(
  records: ChartOfAccount[],
  bankGroupId: number,
): ChartOfAccount[] {
  return records
    .filter((r) => r.parentAccountId === bankGroupId && isBankAccountLedger(r))
    .sort((a, b) => a.accountName.localeCompare(b.accountName));
}

export function getAllBankAccountLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records.filter((r) => isBankAccountLedger(r) && isUnderBankAccounts(r, records));
}

export function findBankGroupForLedger(
  records: ChartOfAccount[],
  ledger: ChartOfAccount,
): ChartOfAccount | null {
  if (!ledger.parentAccountId) return null;
  const parent = records.find((r) => r.id === ledger.parentAccountId);
  if (!parent) return null;
  if (isBankGroupNode(parent)) return parent;
  return null;
}
