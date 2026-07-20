/**
 * COA → ERP party master create/edit routes.
 * Prefer specializedGroupType + stable account codes over display labels.
 */

import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { resolveCoaLedgerBehavior } from "@/lib/accounts/coa-ledger-behavior";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

const SUNDRY_DEBTORS_CODES = new Set(["1212"]);
const SUNDRY_CREDITORS_CODES = new Set(["2310"]);

function ancestorPath(records: ChartOfAccount[], nodeId: number): ChartOfAccount[] {
  const byId = new Map(records.map((r) => [r.id, r]));
  const path: ChartOfAccount[] = [];
  const visited = new Set<number>();
  let current = byId.get(nodeId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current =
      current.parentAccountId == null ? undefined : byId.get(current.parentAccountId);
  }
  return path;
}

function normalizedName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable party-master kind for a COA group (or any ancestor). */
export function resolveCoaPartyMasterKind(
  parent: ChartOfAccount,
  records: ChartOfAccount[],
): "customer" | "vendor" | null {
  const path = ancestorPath(records, parent.id);

  for (let i = path.length - 1; i >= 0; i -= 1) {
    const node = path[i];
    if (node.specializedGroupType === "sundry_debtors") return "customer";
    if (node.specializedGroupType === "sundry_creditors") return "vendor";
    if (SUNDRY_DEBTORS_CODES.has(node.accountCode)) return "customer";
    if (SUNDRY_CREDITORS_CODES.has(node.accountCode)) return "vendor";

    const name = normalizedName(node.accountName);
    if (
      name === "sundry debtors" ||
      name === "trade receivables / sundry debtors" ||
      name === "trade receivables" ||
      name === "accounts receivable"
    ) {
      return "customer";
    }
    if (
      name === "sundry creditors" ||
      name === "trade payables / sundry creditors" ||
      name === "trade payables" ||
      name === "accounts payable"
    ) {
      return "vendor";
    }
  }

  const kind = resolveCoaLedgerBehavior(parent, records).kind;
  if (kind === "customer" || kind === "vendor") return kind;
  return null;
}

export function resolveCoaPartyMasterKindById(
  parentGroupId: number,
  records?: ChartOfAccount[],
): "customer" | "vendor" | null {
  const list = records ?? loadChartOfAccounts();
  const parent = list.find((r) => r.id === parentGroupId);
  if (!parent) return null;
  return resolveCoaPartyMasterKind(parent, list);
}

/** Create-form href for Sundry Debtors / Creditors; null for generic groups. */
export function coaPartyMasterCreateHref(
  parentGroupId: number,
  records?: ChartOfAccount[],
): string | null {
  const kind = resolveCoaPartyMasterKindById(parentGroupId, records);
  if (kind === "customer") {
    return `/masters/customers/new?source=chart-of-accounts&parentNodeId=${parentGroupId}&returnTo=${encodeURIComponent(`${CHART_OF_ACCOUNTS_HREF}?node=${parentGroupId}`)}`;
  }
  if (kind === "vendor") {
    return `/masters/vendors/new?source=chart-of-accounts&parentNodeId=${parentGroupId}&returnTo=${encodeURIComponent(`${CHART_OF_ACCOUNTS_HREF}?node=${parentGroupId}`)}`;
  }
  return null;
}

export function coaPartyMasterEditHref(
  category: "customer" | "vendor",
  sourceId: number,
): string {
  if (category === "customer") return `/masters/customers/${sourceId}/edit`;
  return `/masters/vendors/${sourceId}/edit`;
}
