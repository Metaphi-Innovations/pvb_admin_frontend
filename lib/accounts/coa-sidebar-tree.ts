/**
 * Chart of Accounts — left sidebar tree only (4-level display).
 *
 * L1 Primary Head → L2 Account Group → L3 Subgroup → L4 Ledger
 *
 * Does not alter stored COA data or dropdown / voucher picker trees.
 */

import type { ChartOfAccount, CoaSpecializedGroupType } from "@/app/(app)/accounts/data";
import {
  canDeleteLedger,
  canEditLedger,
  getAncestorPath,
  getChildGroups,
  getDirectChildren,
  getSearchMatchingNodes,
  hasChildAccountGroups,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { ledgerHasChildLedgers } from "@/lib/accounts/coa-hierarchy";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import {
  getBankAccountLedgersUnderGroup,
  getBankAccountsSubGroup,
  getBankGroups,
  isBankAccountsSubGroup,
  isBankGroupNode,
} from "@/lib/accounts/bank-coa-utils";
import type { CoaVisualLevel } from "@/app/(app)/accounts/masters/chart-of-accounts/components/coa-tree-visual";

const CONTAINER_SPECIALIZED_TYPES = new Set<CoaSpecializedGroupType>([
  "gst_receivable",
]);

function parentOf(
  records: ChartOfAccount[],
  node: ChartOfAccount,
): ChartOfAccount | null {
  if (node.parentAccountId == null) return null;
  return records.find((r) => r.id === node.parentAccountId) ?? null;
}

/** Hidden GST/TCS container subgroups — ledgers roll up to the parent L3 subgroup. */
export function isCoaSidebarContainerSubgroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "account_group") return false;
  if (hasChildAccountGroups(records, node.id)) return false;
  if (
    node.specializedGroupType &&
    CONTAINER_SPECIALIZED_TYPES.has(node.specializedGroupType)
  ) {
    return true;
  }
  return false;
}

/**
 * Level 3 subgroup — static leaf group, or a duties-style parent whose only
 * nested groups are statutory containers (GST Input / Output, etc.).
 */
export function isCoaSidebarLevel3Subgroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "account_group") return false;

  const childGroups = getChildGroups(records, node.id);
  if (childGroups.length === 0) {
    const parent = parentOf(records, node);
    return parent != null && parent.nodeLevel !== "primary_head";
  }

  return childGroups.every((g) => isCoaSidebarContainerSubgroup(g, records));
}

/** Level 2 account group — directly under a primary head, or a non-L3 branch head. */
export function isCoaSidebarLevel2AccountGroup(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "account_group") return false;
  const parent = parentOf(records, node);
  if (parent?.nodeLevel === "primary_head") return true;
  if (hasChildAccountGroups(records, node.id) && !isCoaSidebarLevel3Subgroup(node, records)) {
    return true;
  }
  return false;
}

/** Collect L3 subgroups shown under an L2 (or intermediate) account group. */
function collectSidebarLevel3Subgroups(
  records: ChartOfAccount[],
  parentId: number,
): ChartOfAccount[] {
  const result: ChartOfAccount[] = [];
  const seen = new Set<number>();

  const walk = (id: number) => {
    for (const child of getChildGroups(records, id)) {
      if (isCoaSidebarContainerSubgroup(child, records)) continue;
      if (isCoaSidebarLevel3Subgroup(child, records)) {
        if (!seen.has(child.id)) {
          seen.add(child.id);
          result.push(child);
        }
        continue;
      }
      if (hasChildAccountGroups(records, child.id)) {
        walk(child.id);
      }
    }
  };

  walk(parentId);
  return result.sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/** Flatten nested ledgers and container subgroups to a single L4 list. */
function collectSidebarLedgers(
  records: ChartOfAccount[],
  subgroupId: number,
): ChartOfAccount[] {
  const result: ChartOfAccount[] = [];
  const seen = new Set<number>();

  const addLedger = (ledger: ChartOfAccount) => {
    if (seen.has(ledger.id)) return;
    seen.add(ledger.id);
    result.push(ledger);
  };

  const walk = (parentId: number) => {
    for (const child of getDirectChildren(records, parentId)) {
      if (isBankGroupNode(child)) continue;

      if (child.nodeLevel === "ledger") {
        if (ledgerHasChildLedgers(child.id, records)) {
          addLedger(child);
          walk(child.id);
        } else {
          addLedger(child);
        }
        continue;
      }

      if (
        child.nodeLevel === "account_group" &&
        isCoaSidebarContainerSubgroup(child, records)
      ) {
        walk(child.id);
      }
    }
  };

  if (isBankAccountsSubGroup(records.find((r) => r.id === subgroupId)!)) {
    for (const group of getBankGroups(records)) {
      for (const ledger of getBankAccountLedgersUnderGroup(records, group.id)) {
        addLedger(ledger);
      }
    }
    return result.sort((a, b) => a.accountName.localeCompare(b.accountName));
  }

  walk(subgroupId);
  return result.sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/** Sidebar tree children — enforces the 4-level hierarchy for display only. */
export function getCoaSidebarTreeChildren(
  records: ChartOfAccount[],
  parentId: number,
): ChartOfAccount[] {
  const parent = records.find((r) => r.id === parentId);
  if (!parent) return [];

  if (parent.nodeLevel === "primary_head") {
    return getChildGroups(records, parentId);
  }

  if (parent.nodeLevel === "account_group") {
    if (isCoaSidebarLevel3Subgroup(parent, records)) {
      return collectSidebarLedgers(records, parentId);
    }
    if (parent.specializedGroupType === "gst_duties") {
      const directLedgers = getDirectChildren(records, parentId).filter(
        (child) => child.nodeLevel === "ledger",
      );
      return [
        ...collectSidebarLevel3Subgroups(records, parentId),
        ...directLedgers,
      ].sort((a, b) => a.accountName.localeCompare(b.accountName));
    }
    return collectSidebarLevel3Subgroups(records, parentId);
  }

  return [];
}

export function coaSidebarNodeHasChildren(
  records: ChartOfAccount[],
  parentId: number,
): boolean {
  return getCoaSidebarTreeChildren(records, parentId).length > 0;
}

/** Ledgers never expand in the sidebar; structural nodes expand when they have sidebar children. */
export function coaSidebarNodeShowsExpandChevron(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel === "ledger") return false;
  return coaSidebarNodeHasChildren(records, node.id);
}

export function canCoaSidebarAddLedgerUnder(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  return (
    isCoaSidebarLevel3Subgroup(node, records) &&
    !isAddLedgerBlocked(node, records)
  );
}

export function canCoaSidebarEditNode(
  node: ChartOfAccount,
  records?: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "ledger") return false;
  return canEditLedger(node, records);
}

export function canCoaSidebarDeleteNode(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): boolean {
  if (node.nodeLevel !== "ledger") return false;
  return canDeleteLedger(node, records);
}

/** Visual level for sidebar rows — capped at 4 (no sub-ledger styling). */
export function resolveCoaSidebarVisualLevel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaVisualLevel {
  if (node.nodeLevel === "primary_head") return "primary_head";
  if (node.nodeLevel === "ledger") return "ledger";
  if (isCoaSidebarLevel3Subgroup(node, records)) return "sub_group";
  return "account_group";
}

export function getCoaSidebarExpandableIds(records: ChartOfAccount[]): number[] {
  return records
    .filter(
      (r) =>
        r.nodeLevel !== "ledger" &&
        !r.bankGroupFlag &&
        coaSidebarNodeHasChildren(records, r.id),
    )
    .map((r) => r.id);
}

/** Search visibility for the sidebar tree — uses sidebar children, not raw COA nesting. */
export function getCoaSidebarSearchVisibleIds(
  records: ChartOfAccount[],
  query: string,
): Set<number> {
  const visible = new Set<number>();
  if (!query.trim()) return visible;

  const matching = getSearchMatchingNodes(records, query);
  for (const node of matching) {
    getAncestorPath(records, node.id).forEach((a) => {
      if (!a.bankGroupFlag) visible.add(a.id);
    });

    const collectDesc = (id: number) => {
      getCoaSidebarTreeChildren(records, id).forEach((c) => {
        visible.add(c.id);
        if (c.nodeLevel !== "ledger") collectDesc(c.id);
      });
    };
    collectDesc(node.id);
  }
  return visible;
}

/** Resolve sidebar selection — bank name containers redirect to Bank Accounts subgroup. */
export function resolveCoaSidebarSelectionNode(
  records: ChartOfAccount[],
  node: ChartOfAccount,
): ChartOfAccount {
  if (!isBankGroupNode(node)) return node;
  return getBankAccountsSubGroup(records) ?? node;
}

/** Whether a node is omitted from the sidebar tree (bank group containers, etc.). */
export function isCoaSidebarHiddenNode(node: ChartOfAccount): boolean {
  return isBankGroupNode(node);
}
