/**
 * Finance module hierarchy — Chart of Accounts (max 5 levels).
 *
 * L1 Primary Head → L2 Account Group → L3 Sub Group → L4 Ledger → L5 Sub Ledger
 *
 * Posting rule: voucher entries target posting ledgers only (leaf ledgers with no children).
 * Grouping ledgers (L4 with L5 children) cannot receive postings — consolidated balances roll up.
 * Primary heads are system-defined and locked. No node may be created below Level 5.
 */

import type { ChartOfAccount, CoaNodeLevel } from "@/app/(app)/accounts/data";
import { getPostableCoaAccounts, loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

export {
  COA_MAX_HIERARCHY_LEVEL,
  COA_HIERARCHY_LEVEL_LABELS,
  COA_MAX_HIERARCHY_MESSAGE,
} from "./coa-hierarchy-constants";

export {
  getCoaHierarchyLevel,
  getCoaHierarchyLevelForNode,
  getCoaHierarchyLevelLabel,
  isAtCoaMaxHierarchyLevel,
  showCoaMaxHierarchyMessage,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";

/** Ordered data-model levels from top of chart to posting leaf */
export const COA_HIERARCHY_LEVELS: CoaNodeLevel[] = [
  "primary_head",
  "account_group",
  "ledger",
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
  account_group: "Standard Group",
  ledger: "Ledger",
};

export const NODE_LEVEL_DESCRIPTIONS: Record<CoaNodeLevel, string> = {
  primary_head: "Top-level system heads: Assets, Liabilities, Income, Expenses (locked)",
  account_group: "System-defined groups and sub-groups (locked) — e.g. Current Assets, Sundry Debtors",
  ledger: "Posting account — mandatory system ledgers are locked; all others are user-created",
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

export function isUserLedgerNode(node: ChartOfAccount): boolean {
  return isLedgerNode(node) && !node.isSystem;
}

export function isStructuralNode(node: Pick<ChartOfAccount, "nodeLevel">): boolean {
  return !isLedgerNode(node);
}

export function ledgerHasChildLedgers(ledgerId: number, records: ChartOfAccount[]): boolean {
  return records.some(
    (r) => r.nodeLevel === "ledger" && r.parentAccountId === ledgerId,
  );
}

/** Ledger with child ledgers — grouping only, no direct postings */
export function isGroupingLedger(node: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  if (!isLedgerNode(node)) return false;
  const list = records ?? loadChartOfAccounts();
  return ledgerHasChildLedgers(node.id, list);
}

/** Leaf ledger — accepts voucher postings when active */
export function isPostingLedger(node: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  if (!isLedgerNode(node)) return false;
  const list = records ?? loadChartOfAccounts();
  return !ledgerHasChildLedgers(node.id, list);
}

/** Only active posting ledgers accept voucher postings */
export function isPostableNode(node: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  const list = records ?? loadChartOfAccounts();
  if (node.status !== "active") return false;
  return isPostingLedger(node, list);
}

/** Primary heads, standard groups, and mandatory system ledgers are permanently locked */
export function isSystemLockedNode(node: ChartOfAccount): boolean {
  return Boolean(node.isSystem);
}

/** Users may only create Level-4 ledgers — never L1/L2/L3 structure. */
export function canUserCreateAtLevel(level: CoaNodeLevel): boolean {
  return level === "ledger";
}

export function isUserCreatedGroup(node: ChartOfAccount): boolean {
  return node.nodeLevel === "account_group" && !node.isSystem;
}

export function canUserEditGroup(node: ChartOfAccount): boolean {
  return isUserCreatedGroup(node);
}

export function canUserDeleteGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (!canUserEditGroup(node)) return false;
  if (records.some((r) => r.parentAccountId === node.id)) return false;
  return true;
}

export function canUserEditNode(node: ChartOfAccount): boolean {
  if (node.isSystem) return false;
  if (canUserEditGroup(node)) return true;
  return isLedgerNode(node);
}

export function canUserDeleteNode(node: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  if (canUserEditGroup(node)) {
    return canUserDeleteGroup(node, records ?? loadChartOfAccounts());
  }
  return canUserEditNode(node);
}

export interface HierarchyPath {
  primaryHead: ChartOfAccount | null;
  accountGroup: ChartOfAccount | null;
  /** Deepest system standard group in the path (leaf account_group) */
  standardGroup: ChartOfAccount | null;
  ledger: ChartOfAccount | null;
  path: ChartOfAccount[];
}

export function resolveHierarchyPath(
  records: ChartOfAccount[],
  nodeId: number,
): HierarchyPath {
  const path = getAncestorPath(records, nodeId);
  const accountGroups = path.filter((n) => n.nodeLevel === "account_group");
  return {
    primaryHead: path.find((n) => n.nodeLevel === "primary_head") ?? null,
    accountGroup: accountGroups[0] ?? null,
    standardGroup: accountGroups[accountGroups.length - 1] ?? null,
    ledger: path.find((n) => n.nodeLevel === "ledger") ?? null,
    path,
  };
}

export function hierarchyBreadcrumb(records: ChartOfAccount[], nodeId: number): string {
  return resolveHierarchyPath(records, nodeId).path.map((n) => n.accountName).join(" › ");
}

/** Remove duplicate posting ledgers — first occurrence wins by ID, then by account code. */
export function dedupeLedgersByIdAndCode(ledgers: ChartOfAccount[]): ChartOfAccount[] {
  const seenIds = new Set<number>();
  const seenCodes = new Set<string>();
  const out: ChartOfAccount[] = [];
  for (const ledger of ledgers) {
    if (seenIds.has(ledger.id)) continue;
    const code = ledger.accountCode?.trim();
    if (code) {
      const normalized = code.toUpperCase();
      if (seenCodes.has(normalized)) continue;
      seenCodes.add(normalized);
    }
    seenIds.add(ledger.id);
    out.push(ledger);
  }
  return out;
}

/** Active COA accounts eligible for voucher posting (deduped, no grouping nodes). */
export function getActivePostingLedgers(records?: ChartOfAccount[]): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  return dedupeLedgersByIdAndCode(getPostableCoaAccounts(list));
}

/**
 * Validates that an account ID is a postable ledger.
 */
export function validatePostingLedgerId(
  ledgerId: number | null | undefined,
  records?: ChartOfAccount[],
): string | null {
  if (ledgerId == null) {
    return "Each voucher line must select a Ledger. Posting to groups or grouping ledgers is not allowed.";
  }
  const list = records ?? loadChartOfAccounts();
  const node = list.find((r) => r.id === ledgerId);
  if (!node) {
    return "Invalid account selected.";
  }
  if (node.nodeLevel === "primary_head") {
    return `Cannot post to Primary Head "${node.accountName}". Select a Ledger.`;
  }
  if (node.nodeLevel === "account_group") {
    return `Cannot post to Standard Group "${node.accountName}". Select a Ledger.`;
  }
  if (!isLedgerNode(node)) {
    return "Voucher posting is allowed only on Ledgers.";
  }
  if (!isPostableNode(node, list)) {
    if (isGroupingLedger(node, list)) {
      return `Ledger "${node.accountName}" is a Level 4 grouping ledger with sub-ledgers. Post to a sub-ledger instead.`;
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
  return node && isLedgerNode(node) ? node : null;
}

/** Resolve a posting ledger by exact account name (for legacy lines saved with name only). */
export function findPostingLedgerByName(
  accountName: string,
  records?: ChartOfAccount[],
): ChartOfAccount | null {
  const needle = accountName.trim().toLowerCase();
  if (!needle) return null;
  const list = records ?? loadChartOfAccounts();
  const postable = getActivePostingLedgers(list).find(
    (l) => l.accountName.trim().toLowerCase() === needle,
  );
  if (postable) return postable;
  return (
    list.find(
      (n) => isLedgerNode(n) && n.accountName.trim().toLowerCase() === needle,
    ) ?? null
  );
}

/** Ledgers whose ancestor path includes a standard group with the given name */
export function getLedgersUnderGroupName(
  groupName: string,
  records?: ChartOfAccount[],
): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  const target = groupName.trim().toLowerCase();
  return getPostableCoaAccounts(list).filter((account) => {
    const { path } = resolveHierarchyPath(list, account.id);
    return path.some(
      (n) =>
        n.nodeLevel === "account_group" &&
        n.accountName.toLowerCase() === target,
    );
  });
}

/** @deprecated Use getLedgersUnderGroupName */
export function getLedgersUnderSubGroupName(
  subGroupName: string,
  records?: ChartOfAccount[],
): ChartOfAccount[] {
  return getLedgersUnderGroupName(subGroupName, records);
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

export function ledgerMatchesGroupFilter(
  ledger: ChartOfAccount,
  groupId: number,
  records?: ChartOfAccount[],
): boolean {
  const list = records ?? loadChartOfAccounts();
  return resolveHierarchyPath(list, ledger.id).path.some((n) => n.id === groupId);
}

/** @deprecated Use ledgerMatchesGroupFilter */
export function ledgerMatchesSubGroupFilter(
  ledger: ChartOfAccount,
  subGroupId: number,
  records?: ChartOfAccount[],
): boolean {
  return ledgerMatchesGroupFilter(ledger, subGroupId, records);
}
