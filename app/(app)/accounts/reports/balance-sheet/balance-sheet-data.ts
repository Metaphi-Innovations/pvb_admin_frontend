import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { isGroupingLedger, isPostingLedger } from "@/lib/accounts/coa-hierarchy";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  computeBalanceSheetLedgerRows,
  getBalanceSheetActivePartyOptions,
  getBalanceSheetBranchOptions,
  getBalanceSheetLedgerGroupOptions,
  getBalanceSheetLedgerOptions,
  getBalanceSheetWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
  type BalanceSheetFilters,
  type BalanceSheetViewType,
} from "@/lib/accounts/balance-sheet-compute";

export type { BalanceSheetFilters, BalanceSheetViewType };

export type BalanceSheetRowKind = "section" | "line" | "total" | "pl";

/** Primary Group → Sub Group → Ledger presentation roles (not calculation). */
export type BalanceSheetHierarchyRole = "primary_group" | "sub_group" | "ledger";

export interface BalanceSheetLineItem {
  id: string;
  particular: string;
  amount: number | null;
  kind: BalanceSheetRowKind;
  section?: "liabilities" | "assets";
  parentId?: string;
  ledgerId?: number;
  sortOrder?: number;
  hierarchyRole?: BalanceSheetHierarchyRole;
  isPlBalance?: boolean;
  partyId?: string | null;
  partyKind?: "customer" | "vendor" | null;
  drillDownHref?: string;
}

export interface BalanceSheetTreeNode {
  item: BalanceSheetLineItem;
  children: BalanceSheetTreeNode[];
  depth: number;
}

export interface BalanceSheetSide {
  sectionTitle: string;
  amountColumnLabel: string;
  balanceSide: "Credit" | "Debit";
  tree: BalanceSheetTreeNode[];
  grandTotal: number;
  grandTotalLabel: string;
}

export interface BalanceSheetStatement {
  lines: BalanceSheetLineItem[];
  totalLiabilities: number;
  totalAssets: number;
  difference: number;
  isBalanced: boolean;
  hasData: boolean;
  netProfit: number;
  unpostedVoucherCount: number;
}

export interface BalanceSheetFilterParams {
  search?: string;
}

export interface BalanceSheetDrillDownFilters {
  asOnDate: string;
  branch?: string;
  warehouse?: string;
  partyId?: string;
}

interface InternalNode {
  id: string;
  particular: string;
  section: "liabilities" | "assets";
  parentId?: string;
  ledgerId?: number;
  amount: number;
  sortOrder: number;
  isPostableLeaf: boolean;
  hierarchyRole: BalanceSheetHierarchyRole;
  isPlBalance?: boolean;
  partyId?: string | null;
  partyKind?: "customer" | "vendor" | null;
}

function resolveHierarchyRole(
  segment: ChartOfAccount,
  records: ChartOfAccount[],
  isPostableLeaf: boolean,
): BalanceSheetHierarchyRole {
  if (segment.nodeLevel === "ledger") {
    if (isPostableLeaf) return "ledger";
    if (isGroupingLedger(segment, records)) return "sub_group";
    return "ledger";
  }

  const path = getAncestorPath(records, segment.id);
  const parent = path[path.length - 2];
  if (parent?.nodeLevel === "primary_head") return "primary_group";
  return "sub_group";
}

export function isBalanceSheetGroupHeading(
  item: Pick<BalanceSheetLineItem, "hierarchyRole">,
): boolean {
  return item.hierarchyRole === "primary_group" || item.hierarchyRole === "sub_group";
}

function nodeIdForCoa(coaId: number): string {
  return `coa-${coaId}`;
}

function displayPathUnderPrimaryHead(ledgerId: number) {
  const records = loadChartOfAccounts();
  const path = getAncestorPath(records, ledgerId);
  const phIdx = path.findIndex((n) => n.nodeLevel === "primary_head");
  if (phIdx < 0) return { path: [], records };
  return { path: path.slice(phIdx + 1), records };
}

function buildInternalNodes(
  filters: BalanceSheetFilters,
  netProfit: number,
  ledgers: ReturnType<typeof computeBalanceSheetLedgerRows>["ledgers"],
): Map<string, InternalNode> {
  const nodeMap = new Map<string, InternalNode>();

  for (const row of ledgers) {
    const { path, records } = displayPathUnderPrimaryHead(row.ledgerId);
    if (path.length === 0) continue;

    let parentId: string | undefined;

    for (let i = 0; i < path.length; i++) {
      const segment = path[i];
      const id = nodeIdForCoa(segment.id);
      const isLast = i === path.length - 1;
      const isPostableLeaf = isLast && isPostingLedger(segment, records);

      if (!isPostableLeaf) {
        if (!nodeMap.has(id)) {
          nodeMap.set(id, {
            id,
            particular: segment.accountName,
            section: row.section,
            parentId,
            amount: 0,
            sortOrder: segment.id,
            isPostableLeaf: false,
            hierarchyRole: resolveHierarchyRole(segment, records, false),
          });
        }
        parentId = id;
        continue;
      }

      nodeMap.set(id, {
        id,
        particular: segment.accountName,
        section: row.section,
        parentId,
        amount: row.amount,
        sortOrder: segment.id,
        isPostableLeaf: true,
        hierarchyRole: resolveHierarchyRole(segment, records, true),
        ledgerId: row.ledgerId,
        partyId: row.partyId,
        partyKind: row.partyKind,
      });
    }
  }

  for (const node of nodeMap.values()) {
    if (!node.isPostableLeaf) node.amount = 0;
  }

  const leaves = [...nodeMap.values()].filter((n) => n.isPostableLeaf);
  for (const leaf of leaves) {
    let parentId = leaf.parentId;
    while (parentId) {
      const parent = nodeMap.get(parentId);
      if (!parent) break;
      parent.amount = roundMoney(parent.amount + leaf.amount);
      parentId = parent.parentId;
    }
  }

  if (filters.viewType === "summary") {
    for (const [id, node] of [...nodeMap.entries()]) {
      if (node.isPostableLeaf && !node.isPlBalance) nodeMap.delete(id);
    }
    for (const [id, node] of [...nodeMap.entries()]) {
      if (node.parentId && !node.isPlBalance) nodeMap.delete(id);
    }
  }

  if (Math.abs(netProfit) > 0) {
    const reservesNode = [...nodeMap.values()].find(
      (n) =>
        n.section === "liabilities" &&
        /reserves|surplus|capital/i.test(n.particular) &&
        !n.isPostableLeaf,
    );
    const plId = "current-period-pl";
    const plNode: InternalNode = {
      id: plId,
      particular:
        netProfit >= 0 ? "Current Period Net Profit" : "Current Period Net Loss",
      section: "liabilities",
      parentId: reservesNode?.id,
      amount: roundMoney(Math.abs(netProfit)),
      sortOrder: 999_999,
      isPostableLeaf: true,
      hierarchyRole: "ledger",
      isPlBalance: true,
    };
    nodeMap.set(plId, plNode);
    let parentId = reservesNode?.id;
    while (parentId) {
      const parent = nodeMap.get(parentId);
      if (!parent) break;
      parent.amount = roundMoney(parent.amount + plNode.amount);
      parentId = parent.parentId;
    }
  }

  return nodeMap;
}

function internalNodesToLineItems(nodeMap: Map<string, InternalNode>): BalanceSheetLineItem[] {
  const items: BalanceSheetLineItem[] = [];

  for (const node of nodeMap.values()) {
    if (node.amount === 0) continue;
    items.push({
      id: node.id,
      particular: node.particular,
      amount: node.amount,
      kind: node.isPlBalance ? "pl" : "line",
      section: node.section,
      parentId: node.parentId,
      ledgerId: node.ledgerId,
      sortOrder: node.sortOrder,
      hierarchyRole: node.hierarchyRole,
      isPlBalance: node.isPlBalance,
      partyId: node.partyId,
      partyKind: node.partyKind,
    });
  }

  return items.sort(
    (a, b) =>
      (a.section ?? "").localeCompare(b.section ?? "") ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.particular.localeCompare(b.particular),
  );
}

function sumRootAmounts(lines: BalanceSheetLineItem[], section: "liabilities" | "assets"): number {
  const sideLines = lines.filter((l) => l.section === section && l.kind !== "section" && l.kind !== "total");
  const byId = new Map(sideLines.map((l) => [l.id, l]));
  const roots = sideLines.filter((l) => !l.parentId || !byId.has(l.parentId));
  return roundMoney(roots.reduce((sum, root) => sum + (root.amount ?? 0), 0));
}

function assembleStatement(
  lineItems: BalanceSheetLineItem[],
  netProfit: number,
  unpostedVoucherCount: number,
): BalanceSheetStatement {
  const liabilityLines = lineItems.filter((l) => l.section === "liabilities");
  const assetLines = lineItems.filter((l) => l.section === "assets");

  const totalLiabilities = sumRootAmounts(liabilityLines, "liabilities");
  const totalAssets = sumRootAmounts(assetLines, "assets");
  const difference = roundMoney(totalAssets - totalLiabilities);

  const lines: BalanceSheetLineItem[] = [];

  if (liabilityLines.length > 0) {
    lines.push({
      id: "sec-liabilities",
      particular: "Liabilities",
      amount: null,
      kind: "section",
      section: "liabilities",
    });
    lines.push(...liabilityLines);
    lines.push({
      id: "total-liabilities",
      particular: "Total Liabilities",
      amount: totalLiabilities,
      kind: "total",
      section: "liabilities",
    });
  }

  if (assetLines.length > 0) {
    lines.push({
      id: "sec-assets",
      particular: "Assets",
      amount: null,
      kind: "section",
      section: "assets",
    });
    lines.push(...assetLines);
    lines.push({
      id: "total-assets",
      particular: "Total Assets",
      amount: totalAssets,
      kind: "total",
      section: "assets",
    });
  }

  return {
    lines,
    totalLiabilities,
    totalAssets,
    difference,
    isBalanced: Math.abs(difference) < 0.01,
    hasData: liabilityLines.length > 0 || assetLines.length > 0,
    netProfit,
    unpostedVoucherCount,
  };
}

export function buildBalanceSheetStatement(filters: BalanceSheetFilters): BalanceSheetStatement {
  const computed = computeBalanceSheetLedgerRows(filters);
  const nodeMap = buildInternalNodes(filters, computed.netProfit, computed.ledgers);
  const lineItems = internalNodesToLineItems(nodeMap);
  return assembleStatement(lineItems, computed.netProfit, computed.unpostedVoucherCount);
}

export function buildBalanceSheetSideTree(
  lines: BalanceSheetLineItem[],
  section: "liabilities" | "assets",
): BalanceSheetTreeNode[] {
  const sideLines = lines.filter(
    (l) => l.section === section && (l.kind === "line" || l.kind === "pl"),
  );
  const byId = new Map(sideLines.map((l) => [l.id, l]));
  const childMap = new Map<string, BalanceSheetLineItem[]>();

  for (const line of sideLines) {
    const parentId = line.parentId;
    if (parentId && byId.has(parentId)) {
      if (!childMap.has(parentId)) childMap.set(parentId, []);
      childMap.get(parentId)!.push(line);
    }
  }

  function buildNode(item: BalanceSheetLineItem, depth: number): BalanceSheetTreeNode {
    const children = (childMap.get(item.id) ?? [])
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.particular.localeCompare(b.particular),
      )
      .map((c) => buildNode(c, depth + 1));
    return { item, children, depth };
  }

  const roots = sideLines
    .filter((l) => !l.parentId || !byId.has(l.parentId))
    .sort(
      (a, b) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
        a.particular.localeCompare(b.particular),
    );

  return roots.map((r) => buildNode(r, 0));
}

export function splitBalanceSheetHorizontal(statement: BalanceSheetStatement): {
  liabilities: BalanceSheetSide;
  assets: BalanceSheetSide;
} {
  return {
    liabilities: {
      sectionTitle: "Liabilities & Equity",
      amountColumnLabel: "Credit (₹)",
      balanceSide: "Credit",
      tree: buildBalanceSheetSideTree(statement.lines, "liabilities"),
      grandTotal: statement.totalLiabilities,
      grandTotalLabel: "Total",
    },
    assets: {
      sectionTitle: "Assets",
      amountColumnLabel: "Debit (₹)",
      balanceSide: "Debit",
      tree: buildBalanceSheetSideTree(statement.lines, "assets"),
      grandTotal: statement.totalAssets,
      grandTotalLabel: "Total",
    },
  };
}

export function collectBalanceSheetGroupIds(tree: BalanceSheetTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: BalanceSheetTreeNode[]) => {
    for (const node of nodes) {
      if (node.children.length > 0) {
        ids.push(node.item.id);
        walk(node.children);
      }
    }
  };
  walk(tree);
  return ids;
}

export function buildBalanceSheetLedgerHref(
  ledgerId: number,
  filters: BalanceSheetDrillDownFilters,
): string {
  const params = new URLSearchParams();
  params.set("ledger", String(ledgerId));
  if (filters.asOnDate) params.set("to", filters.asOnDate);
  if (filters.branch && filters.branch !== "all") params.set("branch", filters.branch);
  if (filters.warehouse && filters.warehouse !== "all") {
    params.set("warehouse", filters.warehouse);
  }
  if (filters.partyId && filters.partyId !== "all") params.set("party", filters.partyId);
  return `${GENERAL_LEDGER_HREF}?${params.toString()}`;
}

export function buildBalanceSheetPartyHref(
  partyId: string,
  partyKind: "customer" | "vendor",
): string {
  const [, idStr] = partyId.split(":");
  if (partyKind === "customer") {
    return `/accounts/receivables/outstanding/${idStr}`;
  }
  return `/accounts/payables/outstanding/${idStr}`;
}

export function filterBalanceSheetStatement(
  statement: BalanceSheetStatement,
  filters: BalanceSheetFilterParams,
): BalanceSheetStatement {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return statement;

  const liabilityMatches: BalanceSheetLineItem[] = [];
  const assetMatches: BalanceSheetLineItem[] = [];
  let currentSection: "liabilities" | "assets" | null = null;

  for (const line of statement.lines) {
    if (line.kind === "section") {
      currentSection = line.section ?? null;
      continue;
    }
    if (line.kind === "total") continue;

    const matches = line.particular.toLowerCase().includes(q);
    if (!matches) continue;

    if (currentSection === "liabilities") liabilityMatches.push(line);
    else if (currentSection === "assets") assetMatches.push(line);
  }

  const includeParents = (
    matches: BalanceSheetLineItem[],
    section: "liabilities" | "assets",
  ): BalanceSheetLineItem[] => {
    const allSectionLines = statement.lines.filter(
      (l) =>
        l.section === section &&
        (l.kind === "line" || l.kind === "pl"),
    );
    const byId = new Map(allSectionLines.map((l) => [l.id, l]));
    const result = new Map<string, BalanceSheetLineItem>();

    for (const line of matches) {
      result.set(line.id, line);
      let parentId = line.parentId;
      while (parentId && byId.has(parentId)) {
        const parent = byId.get(parentId)!;
        result.set(parent.id, parent);
        parentId = parent.parentId;
      }
    }

    const order = allSectionLines.map((l) => l.id);
    return order.filter((id) => result.has(id)).map((id) => result.get(id)!);
  };

  const liabilityWithParents = includeParents(liabilityMatches, "liabilities");
  const assetWithParents = includeParents(assetMatches, "assets");

  function sumFilteredSideAmounts(lines: BalanceSheetLineItem[]): number {
    const parentIdsInSet = new Set(
      lines.filter((l) => l.parentId).map((l) => l.parentId as string),
    );
    const leaves = lines.filter((l) => !parentIdsInSet.has(l.id));
    return roundMoney(leaves.reduce((s, l) => s + (l.amount ?? 0), 0));
  }

  const filteredLines: BalanceSheetLineItem[] = [];

  if (liabilityWithParents.length > 0) {
    filteredLines.push({
      id: "sec-liabilities",
      particular: "Liabilities",
      amount: null,
      kind: "section",
      section: "liabilities",
    });
    filteredLines.push(...liabilityWithParents);
    filteredLines.push({
      id: "total-liabilities",
      particular: "Total Liabilities",
      amount: sumFilteredSideAmounts(liabilityWithParents),
      kind: "total",
      section: "liabilities",
    });
  }

  if (assetWithParents.length > 0) {
    filteredLines.push({
      id: "sec-assets",
      particular: "Assets",
      amount: null,
      kind: "section",
      section: "assets",
    });
    filteredLines.push(...assetWithParents);
    filteredLines.push({
      id: "total-assets",
      particular: "Total Assets",
      amount: sumFilteredSideAmounts(assetWithParents),
      kind: "total",
      section: "assets",
    });
  }

  const totalLiabilities = filteredLines.find((l) => l.id === "total-liabilities")?.amount ?? 0;
  const totalAssets = filteredLines.find((l) => l.id === "total-assets")?.amount ?? 0;
  const difference = roundMoney(totalAssets - totalLiabilities);

  return {
    lines: filteredLines,
    totalLiabilities,
    totalAssets,
    difference,
    isBalanced: Math.abs(difference) < 0.01,
    hasData: filteredLines.length > 0,
    netProfit: statement.netProfit,
    unpostedVoucherCount: statement.unpostedVoucherCount,
  };
}

export interface BalanceSheetExportRow {
  particular: string;
  amount: number | null;
  rowType: "section" | "line" | "total" | "footer";
  indent: number;
}

export interface BalanceSheetHorizontalExportRow {
  liabilityParticular: string;
  liabilityAmount: number | null;
  assetParticular: string;
  assetAmount: number | null;
  rowType: "title" | "header" | "line" | "subtotal" | "total";
  liabilityIndent: number;
  assetIndent: number;
  liabilityBold?: boolean;
  assetBold?: boolean;
}

export function flattenBalanceSheetSideTree(
  tree: BalanceSheetTreeNode[],
  expandedIds: Set<string>,
): Array<{ item: BalanceSheetLineItem; depth: number }> {
  const rows: Array<{ item: BalanceSheetLineItem; depth: number }> = [];
  const walk = (nodes: BalanceSheetTreeNode[]) => {
    for (const node of nodes) {
      rows.push({ item: node.item, depth: node.depth });
      if (node.children.length > 0 && expandedIds.has(node.item.id)) {
        walk(node.children);
      }
    }
  };
  walk(tree);
  return rows;
}

export function flattenBalanceSheetHorizontalForExport(
  statement: BalanceSheetStatement,
  expandedIds: Set<string>,
): BalanceSheetHorizontalExportRow[] {
  const { liabilities, assets } = splitBalanceSheetHorizontal(statement);
  const leftRows = flattenBalanceSheetSideTree(liabilities.tree, expandedIds);
  const rightRows = flattenBalanceSheetSideTree(assets.tree, expandedIds);
  const maxLen = Math.max(leftRows.length, rightRows.length);

  const rows: BalanceSheetHorizontalExportRow[] = [
    {
      liabilityParticular: "Balance Sheet",
      liabilityAmount: null,
      assetParticular: "",
      assetAmount: null,
      rowType: "title",
      liabilityIndent: 0,
      assetIndent: 0,
      liabilityBold: true,
      assetBold: true,
    },
    {
      liabilityParticular: liabilities.sectionTitle,
      liabilityAmount: null,
      assetParticular: assets.sectionTitle,
      assetAmount: null,
      rowType: "header",
      liabilityIndent: 0,
      assetIndent: 0,
      liabilityBold: true,
      assetBold: true,
    },
  ];

  for (let i = 0; i < maxLen; i++) {
    const left = leftRows[i];
    const right = rightRows[i];

    rows.push({
      liabilityParticular: left?.item.particular ?? "",
      liabilityAmount: left?.item.amount ?? null,
      assetParticular: right?.item.particular ?? "",
      assetAmount: right?.item.amount ?? null,
      rowType: "line",
      liabilityIndent: left?.depth ?? 0,
      assetIndent: right?.depth ?? 0,
      liabilityBold: left ? isBalanceSheetGroupHeading(left.item) : false,
      assetBold: right ? isBalanceSheetGroupHeading(right.item) : false,
    });
  }

  rows.push({
    liabilityParticular: liabilities.grandTotalLabel,
    liabilityAmount: liabilities.grandTotal,
    assetParticular: assets.grandTotalLabel,
    assetAmount: assets.grandTotal,
    rowType: "total",
    liabilityIndent: 0,
    assetIndent: 0,
    liabilityBold: true,
    assetBold: true,
  });

  return rows;
}

export function flattenBalanceSheetForExport(
  statement: BalanceSheetStatement,
): BalanceSheetExportRow[] {
  return statement.lines.map((line) => ({
    particular: line.particular,
    amount: line.amount,
    rowType: line.kind === "total" ? "total" : line.kind === "section" ? "section" : "line",
    indent: line.kind === "line" || line.kind === "pl" ? 1 : 0,
  }));
}

export {
  getBalanceSheetActivePartyOptions,
  getBalanceSheetBranchOptions,
  getBalanceSheetLedgerGroupOptions,
  getBalanceSheetLedgerOptions,
  getBalanceSheetWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
};
