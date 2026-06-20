import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  findLedgerById,
  getActivePostingLedgers,
  hierarchyBreadcrumb,
  isPostableNode,
  resolveHierarchyPath,
} from "@/lib/accounts/coa-hierarchy";
import type { VoucherLine } from "@/app/(app)/accounts/vouchers/voucher-data";

export interface LedgerGroupOption {
  groupLabel: string;
  ledgers: ChartOfAccount[];
}

/** @deprecated Use buildCoaHierarchyTree — flat sub-group grouping */
export function buildGroupedPostingLedgers(records?: ChartOfAccount[]): LedgerGroupOption[] {
  const list = records ?? loadChartOfAccounts();
  const postable = getActivePostingLedgers(list);
  const groups = new Map<string, ChartOfAccount[]>();

  for (const ledger of postable) {
    const path = resolveHierarchyPath(list, ledger.id);
    const groupLabel =
      path.subGroup?.accountName ??
      path.accountGroup?.accountName ??
      path.primaryHead?.accountName ??
      "Other";
    const bucket = groups.get(groupLabel) ?? [];
    bucket.push(ledger);
    groups.set(groupLabel, bucket);
  }

  return Array.from(groups.entries())
    .map(([groupLabel, ledgers]) => ({
      groupLabel,
      ledgers: ledgers.sort((a, b) => a.accountName.localeCompare(b.accountName)),
    }))
    .sort((a, b) => a.groupLabel.localeCompare(b.groupLabel));
}

export type CoaHierarchyNodeKind = "group" | "ledger";

export interface CoaHierarchyNode {
  key: string;
  label: string;
  accountCode?: string;
  path: string;
  kind: CoaHierarchyNodeKind;
  ledger?: ChartOfAccount;
  children: CoaHierarchyNode[];
  depth: number;
}

function sortCoaNodes(nodes: ChartOfAccount[]): ChartOfAccount[] {
  return [...nodes].sort((a, b) => a.accountName.localeCompare(b.accountName));
}

/**
 * Build full COA hierarchy tree for Zoho-style account picker.
 * Group headers are non-selectable; only postable ledgers/sub-ledgers are leaves.
 */
export function buildCoaHierarchyTree(
  records?: ChartOfAccount[],
  ledgerFilter?: (ledger: ChartOfAccount) => boolean,
): CoaHierarchyNode[] {
  const list = records ?? loadChartOfAccounts();
  const postable = new Set(
    getActivePostingLedgers(list)
      .filter((l) => !ledgerFilter || ledgerFilter(l))
      .map((l) => l.id),
  );

  const childrenByParent = new Map<number, ChartOfAccount[]>();
  for (const node of list) {
    if (node.parentAccountId == null) continue;
    const bucket = childrenByParent.get(node.parentAccountId) ?? [];
    bucket.push(node);
    childrenByParent.set(node.parentAccountId, bucket);
  }
  for (const [, children] of childrenByParent) {
    children.sort((a, b) => a.accountName.localeCompare(b.accountName));
  }

  function buildFromNode(node: ChartOfAccount, depth: number): CoaHierarchyNode | null {
    const path = hierarchyBreadcrumb(list, node.id);
    const childAccounts = sortCoaNodes(childrenByParent.get(node.id) ?? []);

    if (postable.has(node.id) && isPostableNode(node, list)) {
      return {
        key: `ledger-${node.id}`,
        label: node.accountName,
        accountCode: node.accountCode || undefined,
        path,
        kind: "ledger",
        ledger: node,
        children: [],
        depth,
      };
    }

    const childNodes = childAccounts
      .map((child) => buildFromNode(child, depth + 1))
      .filter((n): n is CoaHierarchyNode => n != null);

    if (childNodes.length === 0) return null;

    return {
      key: `group-${node.id}`,
      label: node.accountName,
      path,
      kind: "group",
      children: childNodes,
      depth,
    };
  }

  const primaryHeads = sortCoaNodes(list.filter((n) => n.nodeLevel === "primary_head"));
  return primaryHeads
    .map((head) => buildFromNode(head, 0))
    .filter((n): n is CoaHierarchyNode => n != null);
}

export function filterCoaHierarchyTree(
  nodes: CoaHierarchyNode[],
  query: string,
): CoaHierarchyNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  function walk(node: CoaHierarchyNode): CoaHierarchyNode | null {
    if (node.kind === "ledger") {
      const code = node.accountCode?.toLowerCase() ?? "";
      return node.label.toLowerCase().includes(q) ||
        node.path.toLowerCase().includes(q) ||
        code.includes(q)
        ? node
        : null;
    }
    const children = node.children.map(walk).filter((n): n is CoaHierarchyNode => n != null);
    if (children.length > 0 || node.label.toLowerCase().includes(q)) {
      return { ...node, children };
    }
    return null;
  }

  return nodes.map(walk).filter((n): n is CoaHierarchyNode => n != null);
}

/** Collect all group keys that should be expanded (for search / default open). */
export function collectExpandableGroupKeys(nodes: CoaHierarchyNode[]): Set<string> {
  const keys = new Set<string>();
  const walk = (node: CoaHierarchyNode) => {
    if (node.kind === "group") {
      keys.add(node.key);
      node.children.forEach(walk);
    }
  };
  nodes.forEach(walk);
  return keys;
}

export type LedgerContactType = "customer" | "vendor" | "employee" | null;

function matchesSubGroup(path: ChartOfAccount[], ...terms: string[]): boolean {
  return path
    .filter((n) => n.nodeLevel === "sub_group")
    .some((n) => {
      const name = n.accountName.toLowerCase();
      return terms.every((t) => name.includes(t.toLowerCase()));
    });
}

/**
 * Resolve whether a ledger row should show customer, vendor, or employee contact picker.
 * Returns null when contact column should be hidden.
 */
export function resolveLedgerContactType(
  ledger: ChartOfAccount,
  records?: ChartOfAccount[],
): LedgerContactType {
  const list = records ?? loadChartOfAccounts();
  const { path } = resolveHierarchyPath(list, ledger.id);

  if (matchesSubGroup(path, "employee advance")) return "employee";
  if (matchesSubGroup(path, "salary payable")) return "employee";
  if (matchesSubGroup(path, "loans", "advances")) return "employee";
  if (matchesSubGroup(path, "receivable") || matchesSubGroup(path, "debtor")) return "customer";
  if (matchesSubGroup(path, "trade payable") || matchesSubGroup(path, "sundry creditor")) {
    return "vendor";
  }

  return null;
}

export function contactRequiredForLedger(ledger: ChartOfAccount, records?: ChartOfAccount[]): boolean {
  return resolveLedgerContactType(ledger, records) != null;
}

/** Validate mandatory contact on receivable / payable / employee lines before post. */
export function validateVoucherContactLines(
  lines: VoucherLine[],
  records = loadChartOfAccounts(),
): string | null {
  const active = lines.filter(
    (l) => l.ledgerId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0),
  );
  for (const line of active) {
    const ledger = findLedgerById(line.ledgerId!, records);
    if (!ledger) continue;
    const contactType = resolveLedgerContactType(ledger, records);
    if (contactType && !line.contactId) {
      const label =
        contactType === "customer"
          ? "Customer"
          : contactType === "vendor"
            ? "Vendor"
            : "Employee";
      return `${label} contact is required for line "${ledger.accountName}".`;
    }
  }
  return null;
}
