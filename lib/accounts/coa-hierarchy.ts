/**
 * Finance module hierarchy — base architecture for the Accounts module.
 *
 * Primary Head (L1) → Account Group (L2) → Sub-Group (L3) → Ledger (L4) → Sub-Ledger (L5)
 *
 * Posting rule: voucher entries target leaf Ledgers or Sub-Ledgers only.
 * Levels 1–3 are system-defined and locked.
 * Users may create Ledgers under valid leaf sub-groups and Sub-Ledgers under Ledgers.
 */

import type { ChartOfAccount, CoaNodeLevel } from "@/app/(app)/accounts/data";
import { getPostableCoaAccounts, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

/** Ordered levels from top of chart to posting leaf */
export const COA_HIERARCHY_LEVELS: CoaNodeLevel[] = [
  "primary_head",
  "account_group",
  "sub_group",
  "ledger",
  "sub_ledger",
];

export const PRIMARY_HEAD_NAMES = [
  "Assets",
  "Liabilities",
  "Income",
  "Expenses",
] as const;

export type PrimaryHeadName = (typeof PRIMARY_HEAD_NAMES)[number];

export const NODE_LEVEL_LABELS: Record<CoaNodeLevel, string> = {
  primary_head: "Primary Head",
  account_group: "Account Group",
  sub_group: "Sub-Group",
  ledger: "Ledger",
  sub_ledger: "Sub-Ledger",
};

export const NODE_LEVEL_DESCRIPTIONS: Record<CoaNodeLevel, string> = {
  primary_head: "Top-level system heads: Assets, Liabilities, Income, Expenses",
  account_group: "Groups under a Primary Head (e.g. Current Assets, Indirect Expenses)",
  sub_group: "Detailed classification under an Account Group (e.g. Bank Accounts, Trade Payables)",
  ledger: "User-created posting group under a valid sub-group (e.g. HDFC Bank)",
  sub_ledger: "User-created leaf account under a Ledger (e.g. Current Account)",
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

export function isSubLedgerNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return node.nodeLevel === "sub_ledger";
}

export function isUserAccountNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return isLedgerNode(node) || isSubLedgerNode(node);
}

export function isStructuralNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return !isUserAccountNode(node);
}

function ledgerHasSubLedgers(ledgerId: number, records: ChartOfAccount[]): boolean {
  return records.some(
    (r) => r.nodeLevel === "sub_ledger" && r.parentAccountId === ledgerId,
  );
}

/** Only active leaf posting accounts accept voucher postings */
export function isPostableNode(node: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  const list = records ?? loadChartOfAccounts();
  if (node.status !== "active") return false;
  if (isSubLedgerNode(node)) return true;
  if (isLedgerNode(node)) return !ledgerHasSubLedgers(node.id, list);
  return false;
}

/** Primary heads, account groups, and sub-groups are system-locked */
export function isSystemLockedNode(node: ChartOfAccount): boolean {
  return node.isSystem && isStructuralNode(node);
}

export function canUserCreateAtLevel(level: CoaNodeLevel): boolean {
  return level === "ledger" || level === "sub_ledger";
}

export function canUserEditNode(node: ChartOfAccount): boolean {
  if (isSystemLockedNode(node)) return false;
  return isUserAccountNode(node) && !node.isSystem;
}

export function canUserDeleteNode(node: ChartOfAccount): boolean {
  return canUserEditNode(node);
}

export interface HierarchyPath {
  primaryHead: ChartOfAccount | null;
  accountGroup: ChartOfAccount | null;
  subGroup: ChartOfAccount | null;
  ledger: ChartOfAccount | null;
  subLedger: ChartOfAccount | null;
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
    subLedger: path.find((n) => n.nodeLevel === "sub_ledger") ?? null,
    path,
  };
}

export function hierarchyBreadcrumb(records: ChartOfAccount[], nodeId: number): string {
  return resolveHierarchyPath(records, nodeId).path.map((n) => n.accountName).join(" › ");
}

/** Active COA accounts eligible for voucher posting */
export function getActivePostingLedgers(records?: ChartOfAccount[]): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  return getPostableCoaAccounts(list);
}

/**
 * Validates that an account ID is a postable COA ledger or sub-ledger.
 */
export function validatePostingLedgerId(
  ledgerId: number | null | undefined,
  records?: ChartOfAccount[],
): string | null {
  if (ledgerId == null) {
    return "Each voucher line must select a Ledger or Sub-Ledger. Posting to structural nodes is not allowed.";
  }
  const list = records ?? loadChartOfAccounts();
  const node = list.find((r) => r.id === ledgerId);
  if (!node) {
    return "Invalid account selected.";
  }
  if (node.nodeLevel === "primary_head") {
    return `Cannot post to Primary Head "${node.accountName}". Select a Ledger or Sub-Ledger.`;
  }
  if (node.nodeLevel === "account_group") {
    return `Cannot post to Account Group "${node.accountName}". Select a Ledger or Sub-Ledger.`;
  }
  if (node.nodeLevel === "sub_group") {
    return `Cannot post to Sub-Group "${node.accountName}". Select a Ledger under this sub-group.`;
  }
  if (!isUserAccountNode(node)) {
    return "Voucher posting is allowed only on Ledgers and Sub-Ledgers.";
  }
  if (!isPostableNode(node, list)) {
    if (isLedgerNode(node) && ledgerHasSubLedgers(node.id, list)) {
      return `Ledger "${node.accountName}" has sub-ledgers. Post to a Sub-Ledger instead.`;
    }
    return `Account "${node.accountName}" is inactive and cannot receive postings.`;
  }
  return null;
}

export function findLedgerById(
  ledgerId: number,
  records?: ChartOfAccount[],
): ChartOfAccount | null {
  const list = records ?? loadChartOfAccounts();
  const node = list.find((r) => r.id === ledgerId);
  return node && isUserAccountNode(node) ? node : null;
}

/** Ledgers whose ancestor path includes a sub-group with the given name */
export function getLedgersUnderSubGroupName(
  subGroupName: string,
  records?: ChartOfAccount[],
): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  const target = subGroupName.trim().toLowerCase();
  return getPostableCoaAccounts(list).filter((account) => {
    const { path } = resolveHierarchyPath(list, account.id);
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

export function canAddSubLedgerUnder(ledger: ChartOfAccount): boolean {
  return isLedgerNode(ledger) && !ledger.isSystem;
}
