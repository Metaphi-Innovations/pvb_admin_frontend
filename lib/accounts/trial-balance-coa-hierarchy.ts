/**
 * Trial Balance detailed report — COA placement using the same L1–L4 rules as the COA sidebar.
 * L1 Primary Head → L2 Account Group → L3 Sub Group → L4 Ledger
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  isCoaSidebarLevel2AccountGroup,
  isCoaSidebarLevel3Subgroup,
} from "@/lib/accounts/coa-sidebar-tree";

export interface TrialBalanceLedgerCoaPlacement {
  primaryHead: ChartOfAccount;
  accountGroup: ChartOfAccount;
  subGroup: ChartOfAccount;
}

export function resolveTrialBalanceLedgerCoaPlacement(
  ledgerId: number,
  records?: ChartOfAccount[],
): TrialBalanceLedgerCoaPlacement | null {
  const list = records ?? loadChartOfAccounts();
  const ledger = list.find((r) => r.id === ledgerId && r.nodeLevel === "ledger");
  if (!ledger) return null;

  const path = getAncestorPath(list, ledgerId);
  const primaryHead = path.find((n) => n.nodeLevel === "primary_head");
  if (!primaryHead) return null;

  const accountGroupsInPath = path.filter((n) => n.nodeLevel === "account_group");

  let subGroup: ChartOfAccount | null = null;
  for (let i = accountGroupsInPath.length - 1; i >= 0; i--) {
    const node = accountGroupsInPath[i]!;
    if (isCoaSidebarLevel3Subgroup(node, list)) {
      subGroup = node;
      break;
    }
  }

  if (!subGroup) {
    let current: ChartOfAccount | undefined = ledger;
    const visited = new Set<number>();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      const parentId: number | null | undefined = current.parentAccountId;
      if (parentId == null) break;
      const parent: ChartOfAccount | undefined = list.find((r) => r.id === parentId);
      if (!parent) break;
      if (
        parent.nodeLevel === "account_group" &&
        isCoaSidebarLevel3Subgroup(parent, list)
      ) {
        subGroup = parent;
        break;
      }
      if (parent.nodeLevel === "ledger") {
        current = parent;
        continue;
      }
      break;
    }
  }

  if (!subGroup) return null;

  const subGroupPath = getAncestorPath(list, subGroup.id);
  const accountGroup =
    subGroupPath.find(
      (n) =>
        n.nodeLevel === "account_group" &&
        isCoaSidebarLevel2AccountGroup(n, list),
    ) ?? null;

  if (!accountGroup) return null;

  return { primaryHead, accountGroup, subGroup };
}
