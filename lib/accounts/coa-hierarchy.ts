/**
 * Finance module hierarchy — base architecture for the Accounts module.
 *
 * Primary Head → Account Group → Sub-Group → Ledger → Voucher Entry
 *
 * Posting rule: voucher entries may target Ledgers only.
 * Structural nodes (primary head, account group, sub-group) are system-defined and locked.
 * Users may create Ledgers under valid leaf sub-groups only.
 */

import type { ChartOfAccount, CoaNodeLevel } from "@/app/(app)/accounts/data";
import { getCoaLedgers, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

/** Ordered levels from top of chart to posting leaf */
export const COA_HIERARCHY_LEVELS: CoaNodeLevel[] = [
  "primary_head",
  "account_group",
  "sub_group",
  "ledger",
];

export const PRIMARY_HEAD_NAMES = [
  "Assets",
  "Liabilities",
  "Income",
  "Expenses",
] as const;

export type PrimaryHeadName = (typeof PRIMARY_HEAD_NAMES)[number];

export const NODE_LEVEL_DESCRIPTIONS: Record<CoaNodeLevel, string> = {
  primary_head: "Top-level system heads: Assets, Liabilities, Income, Expenses",
  account_group: "Groups under a Primary Head (e.g. Current Assets, Indirect Expenses)",
  sub_group: "Detailed classification under an Account Group (e.g. Bank Accounts, Salaries & Wages)",
  ledger: "User-created posting account under a valid sub-group",
};

export function nextHierarchyLevel(level: CoaNodeLevel): CoaNodeLevel | null {
  const idx = COA_HIERARCHY_LEVELS.indexOf(level);
  return idx >= 0 && idx < COA_HIERARCHY_LEVELS.length - 1
    ? COA_HIERARCHY_LEVELS[idx + 1]
    : null;
}

export function isLedgerNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return node.nodeLevel === "ledger";
}

export function isStructuralNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return !isLedgerNode(node);
}

/** Only active ledgers accept voucher postings */
export function isPostableNode(node: ChartOfAccount): boolean {
  return isLedgerNode(node) && node.status === "active";
}

/** Primary heads, account groups, and CA sub-groups are system-locked */
export function isSystemLockedNode(node: ChartOfAccount): boolean {
  return node.isSystem && isStructuralNode(node);
}

export function canUserCreateAtLevel(level: CoaNodeLevel): boolean {
  return level === "ledger";
}

export function canUserEditNode(node: ChartOfAccount): boolean {
  if (isSystemLockedNode(node)) return false;
  return isLedgerNode(node) && !node.isSystem;
}

export function canUserDeleteNode(node: ChartOfAccount): boolean {
  return canUserEditNode(node);
}

export interface HierarchyPath {
  primaryHead: ChartOfAccount | null;
  accountGroup: ChartOfAccount | null;
  subGroup: ChartOfAccount | null;
  ledger: ChartOfAccount | null;
  path: ChartOfAccount[];
}

export function resolveHierarchyPath(
  records: ChartOfAccount[],
  nodeId: number,
): HierarchyPath {
  const path = getAncestorPath(records, nodeId);
  return {
    primaryHead: path.find((n) => n.nodeLevel === "primary_head") ?? null,
    accountGroup: path.find((n) => n.nodeLevel === "account_group") ?? null,
    subGroup: path.find((n) => n.nodeLevel === "sub_group") ?? null,
    ledger: path.find((n) => n.nodeLevel === "ledger") ?? null,
    path,
  };
}

export function hierarchyBreadcrumb(records: ChartOfAccount[], nodeId: number): string {
  return resolveHierarchyPath(records, nodeId).path.map((n) => n.accountName).join(" › ");
}

/** Active COA ledgers eligible for voucher posting */
export function getActivePostingLedgers(records?: ChartOfAccount[]): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  return list.filter(isPostableNode);
}

/**
 * Validates that a ledger ID is a postable COA ledger.
 * Rejects primary heads, account groups, sub-groups, inactive or missing nodes.
 */
export function validatePostingLedgerId(
  ledgerId: number | null | undefined,
  records?: ChartOfAccount[],
): string | null {
  if (ledgerId == null) {
    return "Each voucher line must select a Ledger. Posting to Primary Head, Account Group or Sub-Group is not allowed.";
  }
  const list = records ?? loadChartOfAccounts();
  const node = list.find((r) => r.id === ledgerId);
  if (!node) {
    return "Invalid ledger selected.";
  }
  if (node.nodeLevel === "primary_head") {
    return `Cannot post to Primary Head "${node.accountName}". Select a Ledger under a valid sub-group.`;
  }
  if (node.nodeLevel === "account_group") {
    return `Cannot post to Account Group "${node.accountName}". Select a Ledger under a valid sub-group.`;
  }
  if (node.nodeLevel === "sub_group") {
    return `Cannot post to Sub-Group "${node.accountName}". Select a Ledger under this sub-group.`;
  }
  if (node.nodeLevel !== "ledger") {
    return "Voucher posting is allowed only on Ledgers.";
  }
  if (node.status !== "active") {
    return `Ledger "${node.accountName}" is inactive and cannot receive postings.`;
  }
  return null;
}

export function findLedgerById(
  ledgerId: number,
  records?: ChartOfAccount[],
): ChartOfAccount | null {
  const list = records ?? loadChartOfAccounts();
  const node = list.find((r) => r.id === ledgerId);
  return node && isLedgerNode(node) ? node : null;
}

/** Ledgers whose ancestor path includes a sub-group with the given name */
export function getLedgersUnderSubGroupName(
  subGroupName: string,
  records?: ChartOfAccount[],
): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  const target = subGroupName.trim().toLowerCase();
  return getCoaLedgers().filter((ledger) => {
    const { path } = resolveHierarchyPath(list, ledger.id);
    return path.some(
      (n) =>
        n.nodeLevel === "sub_group" &&
        n.accountName.toLowerCase() === target,
    );
  });
}

export function ledgerHasAncestorNamed(
  ledger: ChartOfAccount,
  ancestorName: string,
  records?: ChartOfAccount[],
): boolean {
  const list = records ?? loadChartOfAccounts();
  const target = ancestorName.trim().toLowerCase();
  return resolveHierarchyPath(list, ledger.id).path.some(
    (n) => n.accountName.toLowerCase() === target,
  );
}

export function ledgerMatchesSubGroupFilter(
  ledger: ChartOfAccount,
  subGroupId: number,
  records?: ChartOfAccount[],
): boolean {
  const list = records ?? loadChartOfAccounts();
  return resolveHierarchyPath(list, ledger.id).path.some((n) => n.id === subGroupId);
}
