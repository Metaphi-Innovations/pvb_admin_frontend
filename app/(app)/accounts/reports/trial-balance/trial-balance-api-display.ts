import type {
  TrialBalanceHierarchyNode,
  TrialBalanceNormalRow,
} from "@/types/trial-balance.types";
import {
  ACCOUNTS_COA_HIERARCHY_INDENT,
} from "@/lib/accounts/accounts-coa-hierarchy-ui";

export const TB_DETAILED_INDENT = {
  primary: ACCOUNTS_COA_HIERARCHY_INDENT.primary_head,
  group: ACCOUNTS_COA_HIERARCHY_INDENT.account_group,
  subgroup: ACCOUNTS_COA_HIERARCHY_INDENT.sub_group,
  ledger: ACCOUNTS_COA_HIERARCHY_INDENT.ledger,
} as const;

export const TB_NORMAL_INDENT = {
  primary: ACCOUNTS_COA_HIERARCHY_INDENT.primary_head,
  ledger: ACCOUNTS_COA_HIERARCHY_INDENT.ledger,
} as const;

export type NormalPrimaryHeadRow = {
  id: string;
  name: string;
  code: string;
  debit: string;
  credit: string;
};

/**
 * Normal Report rows = Primary Head closing balances from Detailed hierarchy.
 * Parents expose gross descendant Debit and Credit (same as Detailed parents).
 * Frontend does not net.
 */
export function toNormalPrimaryHeadRows(
  nodes: TrialBalanceHierarchyNode[]
): NormalPrimaryHeadRow[] {
  return nodes
    .filter((n) => n.type === "PRIMARY_HEAD")
    .map((head) => ({
      id: head.id,
      name: head.name,
      code: head.code,
      debit: head.closing.debit,
      credit: head.closing.credit,
    }));
}

export type DetailedFlatRow =
  | {
      type: "primary";
      id: string;
      name: string;
      code: string;
      debit: string;
      credit: string;
      ledgerCount: number;
    }
  | {
      type: "group";
      id: string;
      name: string;
      code: string;
      debit: string;
      credit: string;
      ledgerCount: number;
    }
  | {
      type: "subgroup";
      id: string;
      name: string;
      code: string;
      debit: string;
      credit: string;
      ledgerCount: number;
    }
  | {
      type: "ledger";
      id: string;
      name: string;
      code: string;
      debit: string;
      credit: string;
    };

/** Display-only descendant ledger count from already-loaded hierarchy (not accounting). */
export function countDescendantLedgers(node: TrialBalanceHierarchyNode): number {
  if (node.type === "LEDGER") return 1;
  return (node.children ?? []).reduce(
    (sum, child) => sum + countDescendantLedgers(child),
    0
  );
}

export function collectPrimaryHeadIds(
  nodes: TrialBalanceHierarchyNode[]
): Set<string> {
  return new Set(
    nodes.filter((n) => n.type === "PRIMARY_HEAD").map((n) => n.id)
  );
}

/**
 * Flatten nested DETAILED hierarchy using local expand sets.
 * No API calls — children already present in the response.
 */
export function flattenDetailedHierarchy(
  nodes: TrialBalanceHierarchyNode[],
  expandedPrimaryIds: Set<string>,
  expandedGroupIds: Set<string>,
  expandedSubgroupIds: Set<string>
): DetailedFlatRow[] {
  const rows: DetailedFlatRow[] = [];

  for (const head of nodes) {
    rows.push({
      type: "primary",
      id: head.id,
      name: head.name,
      code: head.code,
      debit: head.closing.debit,
      credit: head.closing.credit,
      ledgerCount: countDescendantLedgers(head),
    });

    if (!expandedPrimaryIds.has(head.id)) continue;

    for (const group of head.children ?? []) {
      rows.push({
        type: "group",
        id: group.id,
        name: group.name,
        code: group.code,
        debit: group.closing.debit,
        credit: group.closing.credit,
        ledgerCount: countDescendantLedgers(group),
      });

      if (!expandedGroupIds.has(group.id)) continue;

      for (const sub of group.children ?? []) {
        rows.push({
          type: "subgroup",
          id: sub.id,
          name: sub.name,
          code: sub.code,
          debit: sub.closing.debit,
          credit: sub.closing.credit,
          ledgerCount: countDescendantLedgers(sub),
        });

        if (!expandedSubgroupIds.has(sub.id)) continue;

        for (const ledger of sub.children ?? []) {
          rows.push({
            type: "ledger",
            id: ledger.id,
            name: ledger.name,
            code: ledger.code,
            debit: ledger.closing.debit,
            credit: ledger.closing.credit,
          });
        }
      }
    }
  }

  return rows;
}

export function isHierarchyData(
  data: TrialBalanceNormalRow[] | TrialBalanceHierarchyNode[]
): data is TrialBalanceHierarchyNode[] {
  return Array.isArray(data) && (data.length === 0 || "type" in data[0]);
}

export function isNormalData(
  data: TrialBalanceNormalRow[] | TrialBalanceHierarchyNode[]
): data is TrialBalanceNormalRow[] {
  return Array.isArray(data) && (data.length === 0 || "ledger_id" in data[0]);
}
