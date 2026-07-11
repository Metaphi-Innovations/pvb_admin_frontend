/**
 * COA tree display — enforces 5 visual levels (Primary Head → … → Sub Ledger).
 * Bank name containers (bankGroupFlag) stay in data for posting but are flattened out of the tree.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  getAncestorPath,
  getDirectChildren,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  getBankAccountLedgersUnderGroup,
  getBankAccountsSubGroup,
  getBankGroups,
  isBankAccountsSubGroup,
  isBankGroupNode,
} from "@/lib/accounts/bank-coa-utils";

/** Ancestor path for breadcrumbs — skips internal bank name container nodes. */
export function getCoaDisplayPath(
  records: ChartOfAccount[],
  nodeId: number,
): ChartOfAccount[] {
  return getAncestorPath(records, nodeId).filter((n) => !n.bankGroupFlag);
}

/** Cheap expandability check — avoids allocating the children array until expand. */
export function coaTreeNodeHasChildren(
  records: ChartOfAccount[],
  parentId: number,
): boolean {
  const parent = records.find((r) => r.id === parentId);
  if (!parent) return false;

  if (isBankAccountsSubGroup(parent)) {
    return getBankGroups(records).some(
      (group) => getBankAccountLedgersUnderGroup(records, group.id).length > 0,
    );
  }

  return getDirectChildren(records, parentId).some((c) => !isBankGroupNode(c));
}

/** Tree children — bank account ledgers appear directly under Bank Accounts (no 5th level). */
export function getCoaTreeChildren(
  records: ChartOfAccount[],
  parentId: number,
): ChartOfAccount[] {
  const parent = records.find((r) => r.id === parentId);
  if (!parent) return [];

  if (isBankAccountsSubGroup(parent)) {
    const ledgers = getBankGroups(records).flatMap((group) =>
      getBankAccountLedgersUnderGroup(records, group.id),
    );
    return ledgers.sort((a, b) => a.accountName.localeCompare(b.accountName));
  }

  return getDirectChildren(records, parentId).filter((c) => !isBankGroupNode(c));
}

/** Bank name containers are not selectable tree nodes — redirect to Bank Accounts group. */
export function resolveCoaTreeSelectionNode(
  records: ChartOfAccount[],
  node: ChartOfAccount,
): ChartOfAccount {
  if (!isBankGroupNode(node)) return node;
  return getBankAccountsSubGroup(records) ?? node;
}

export function isCoaTreeHiddenNode(node: ChartOfAccount): boolean {
  return isBankGroupNode(node);
}
