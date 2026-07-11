import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import { isPostingLedger } from "@/lib/accounts/coa-hierarchy";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  computePandLLedgerAmounts,
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLLedgerGroupOptions,
  getPandLLedgerOptions,
  getPandLPartyOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
  type PandLFilters,
  type PandLViewType,
} from "@/lib/accounts/pl-compute";

export type { PandLFilters, PandLViewType };

export type PandLRowKind = "section" | "line" | "total" | "net";

export interface PandLLineItem {
  id: string;
  particular: string;
  amount: number | null;
  kind: PandLRowKind;
  section?: "income" | "expense";
  parentId?: string;
  ledgerId?: number;
  isReturn?: boolean;
  isNetBalance?: boolean;
  sortOrder?: number;
}

export interface PandLTreeNode {
  item: PandLLineItem;
  children: PandLTreeNode[];
  depth: number;
}

export interface PandLSide {
  sectionTitle: string;
  amountColumnLabel: string;
  balanceSide: "Debit" | "Credit";
  tree: PandLTreeNode[];
  netBalanceRow: PandLLineItem | null;
  grandTotal: number;
  grandTotalLabel: string;
}

export interface PandLStatement {
  lines: PandLLineItem[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  isBalanced: boolean;
  hasData: boolean;
}

export interface PandLFilterParams {
  search?: string;
}

export interface PandLDrillDownFilters {
  dateFrom: string;
  dateTo: string;
  branch?: string;
  warehouse?: string;
  partyId?: string;
}

interface InternalNode {
  id: string;
  particular: string;
  section: "income" | "expense";
  parentId?: string;
  ledgerId?: number;
  isReturn?: boolean;
  signedAmount: number;
  sortOrder: number;
  isPostableLeaf: boolean;
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

function signedDisplayAmount(signed: number): number {
  return roundMoney(Math.abs(signed));
}

function buildInternalNodes(
  filters: PandLFilters,
): Map<string, InternalNode> {
  const amounts = computePandLLedgerAmounts(filters);
  const nodeMap = new Map<string, InternalNode>();

  for (const row of amounts) {
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
            signedAmount: 0,
            sortOrder: segment.id,
            isPostableLeaf: false,
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
        signedAmount: row.signedAmount,
        sortOrder: segment.id,
        isPostableLeaf: true,
        ledgerId: row.ledgerId,
        isReturn: row.isReturn,
      });
    }
  }

  for (const node of nodeMap.values()) {
    if (!node.isPostableLeaf) node.signedAmount = 0;
  }

  const leaves = [...nodeMap.values()].filter((n) => n.isPostableLeaf);
  for (const leaf of leaves) {
    let parentId = leaf.parentId;
    while (parentId) {
      const parent = nodeMap.get(parentId);
      if (!parent) break;
      parent.signedAmount = roundMoney(parent.signedAmount + leaf.signedAmount);
      parentId = parent.parentId;
    }
  }

  if (filters.viewType === "summary") {
    for (const [id, node] of [...nodeMap.entries()]) {
      if (node.isPostableLeaf) nodeMap.delete(id);
    }
  }

  return nodeMap;
}

function internalNodesToLineItems(nodeMap: Map<string, InternalNode>): PandLLineItem[] {
  const items: PandLLineItem[] = [];

  for (const node of nodeMap.values()) {
    if (node.signedAmount === 0) continue;
    items.push({
      id: node.id,
      particular: node.particular,
      amount: node.isPostableLeaf
        ? roundMoney(Math.abs(node.signedAmount))
        : signedDisplayAmount(node.signedAmount),
      kind: "line",
      section: node.section,
      parentId: node.parentId,
      ledgerId: node.ledgerId,
      isReturn: node.isReturn,
      sortOrder: node.sortOrder,
    });
  }

  return items.sort(
    (a, b) =>
      (a.section ?? "").localeCompare(b.section ?? "") ||
      (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
      a.particular.localeCompare(b.particular),
  );
}

function sumRootSignedAmounts(lines: PandLLineItem[], section: "income" | "expense"): number {
  const sideLines = lines.filter((l) => l.section === section && l.kind === "line");
  const byId = new Map(sideLines.map((l) => [l.id, l]));
  const roots = sideLines.filter((l) => !l.parentId || !byId.has(l.parentId));
  return roundMoney(
    roots.reduce((sum, root) => {
      const signed = root.isReturn ? -(root.amount ?? 0) : (root.amount ?? 0);
      return sum + signed;
    }, 0),
  );
}

function assembleStatement(lineItems: PandLLineItem[]): PandLStatement {
  const incomeLines = lineItems.filter((l) => l.section === "income");
  const expenseLines = lineItems.filter((l) => l.section === "expense");

  const totalIncome = sumRootSignedAmounts(incomeLines, "income");
  const totalExpenses = sumRootSignedAmounts(expenseLines, "expense");
  const netProfit = roundMoney(totalIncome - totalExpenses);

  const lines: PandLLineItem[] = [];

  if (incomeLines.length > 0) {
    lines.push({
      id: "sec-income",
      particular: "Income",
      amount: null,
      kind: "section",
      section: "income",
    });
    lines.push(...incomeLines);
    lines.push({
      id: "total-income",
      particular: "Total Income",
      amount: totalIncome,
      kind: "total",
      section: "income",
    });
  }

  if (expenseLines.length > 0) {
    lines.push({
      id: "sec-expenses",
      particular: "Expenses",
      amount: null,
      kind: "section",
      section: "expense",
    });
    lines.push(...expenseLines);
    lines.push({
      id: "total-expenses",
      particular: "Total Expenses",
      amount: totalExpenses,
      kind: "total",
      section: "expense",
    });
  }

  return {
    lines,
    totalIncome,
    totalExpenses,
    netProfit,
    isBalanced: true,
    hasData: incomeLines.length > 0 || expenseLines.length > 0,
  };
}

export function buildPandLStatement(filters: PandLFilters): PandLStatement {
  const nodeMap = buildInternalNodes(filters);
  const lineItems = internalNodesToLineItems(nodeMap);
  return assembleStatement(lineItems);
}

export function buildPandLSideTree(
  lines: PandLLineItem[],
  section: "income" | "expense",
): PandLTreeNode[] {
  const sideLines = lines.filter((l) => l.section === section && l.kind === "line");
  const byId = new Map(sideLines.map((l) => [l.id, l]));
  const childMap = new Map<string, PandLLineItem[]>();

  for (const line of sideLines) {
    const parentId = line.parentId;
    if (parentId && byId.has(parentId)) {
      if (!childMap.has(parentId)) childMap.set(parentId, []);
      childMap.get(parentId)!.push(line);
    }
  }

  function buildNode(item: PandLLineItem, depth: number): PandLTreeNode {
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

export function splitPandLHorizontal(statement: PandLStatement): {
  expenses: PandLSide;
  income: PandLSide;
} {
  const netProfit = statement.netProfit;
  const isProfit = netProfit >= 0;
  const netAmount = roundMoney(Math.abs(netProfit));
  const balancedGrandTotal = roundMoney(
    isProfit ? statement.totalIncome : statement.totalExpenses,
  );

  const netProfitRow: PandLLineItem | null =
    isProfit && netAmount > 0
      ? {
          id: "net-profit-balance",
          particular: "Net Profit",
          amount: netAmount,
          kind: "net",
          section: "expense",
          isNetBalance: true,
        }
      : null;

  const netLossRow: PandLLineItem | null =
    !isProfit && netAmount > 0
      ? {
          id: "net-loss-balance",
          particular: "Net Loss",
          amount: netAmount,
          kind: "net",
          section: "income",
          isNetBalance: true,
        }
      : null;

  return {
    expenses: {
      sectionTitle: "Expenses (Debit)",
      amountColumnLabel: "Amount (₹)",
      balanceSide: "Debit",
      tree: buildPandLSideTree(statement.lines, "expense"),
      netBalanceRow: netProfitRow,
      grandTotal: balancedGrandTotal,
      grandTotalLabel: "Total",
    },
    income: {
      sectionTitle: "Income (Credit)",
      amountColumnLabel: "Amount (₹)",
      balanceSide: "Credit",
      tree: buildPandLSideTree(statement.lines, "income"),
      netBalanceRow: netLossRow,
      grandTotal: balancedGrandTotal,
      grandTotalLabel: "Total",
    },
  };
}

export function collectPandLGroupIds(tree: PandLTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: PandLTreeNode[]) => {
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

export function buildPandLLedgerHref(
  ledgerId: number,
  filters: PandLDrillDownFilters,
): string {
  const params = new URLSearchParams();
  params.set("ledger", String(ledgerId));
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  if (filters.dateTo) params.set("to", filters.dateTo);
  if (filters.branch && filters.branch !== "all") params.set("branch", filters.branch);
  if (filters.warehouse && filters.warehouse !== "all") {
    params.set("warehouse", filters.warehouse);
  }
  if (filters.partyId && filters.partyId !== "all") params.set("party", filters.partyId);
  return `${GENERAL_LEDGER_HREF}?${params.toString()}`;
}

export function filterPandLStatement(
  statement: PandLStatement,
  filters: PandLFilterParams,
): PandLStatement {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return statement;

  const includeParents = (
    matches: PandLLineItem[],
    section: "income" | "expense",
  ): PandLLineItem[] => {
    const allSectionLines = statement.lines.filter(
      (l) => l.section === section && l.kind === "line",
    );
    const byId = new Map(allSectionLines.map((l) => [l.id, l]));
    const result = new Map<string, PandLLineItem>();

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

  const incomeMatches: PandLLineItem[] = [];
  const expenseMatches: PandLLineItem[] = [];
  let currentSection: "income" | "expense" | null = null;

  for (const line of statement.lines) {
    if (line.kind === "section") {
      currentSection = line.section ?? null;
      continue;
    }
    if (line.kind === "total") continue;

    const matches =
      line.particular.toLowerCase().includes(q) ||
      (line.isReturn && "return".includes(q));
    if (!matches) continue;

    if (currentSection === "income") incomeMatches.push(line);
    else if (currentSection === "expense") expenseMatches.push(line);
  }

  const incomeWithParents = includeParents(incomeMatches, "income");
  const expenseWithParents = includeParents(expenseMatches, "expense");

  const filteredLines: PandLLineItem[] = [];

  if (incomeWithParents.length > 0) {
    filteredLines.push({
      id: "sec-income",
      particular: "Income",
      amount: null,
      kind: "section",
      section: "income",
    });
    filteredLines.push(...incomeWithParents);
    filteredLines.push({
      id: "total-income",
      particular: "Total Income",
      amount: sumRootSignedAmounts(incomeWithParents, "income"),
      kind: "total",
      section: "income",
    });
  }

  if (expenseWithParents.length > 0) {
    filteredLines.push({
      id: "sec-expenses",
      particular: "Expenses",
      amount: null,
      kind: "section",
      section: "expense",
    });
    filteredLines.push(...expenseWithParents);
    filteredLines.push({
      id: "total-expenses",
      particular: "Total Expenses",
      amount: sumRootSignedAmounts(expenseWithParents, "expense"),
      kind: "total",
      section: "expense",
    });
  }

  const totalIncome = filteredLines.find((l) => l.id === "total-income")?.amount ?? 0;
  const totalExpenses = filteredLines.find((l) => l.id === "total-expenses")?.amount ?? 0;
  const netProfit = roundMoney(totalIncome - totalExpenses);

  return {
    lines: filteredLines,
    totalIncome,
    totalExpenses,
    netProfit,
    isBalanced: true,
    hasData: filteredLines.length > 0,
  };
}

export interface PandLHorizontalExportRow {
  expenseParticular: string;
  expenseAmount: number | null;
  incomeParticular: string;
  incomeAmount: number | null;
  rowType: "title" | "header" | "line" | "net" | "total";
  expenseIndent: number;
  incomeIndent: number;
  expenseBold?: boolean;
  incomeBold?: boolean;
  expenseIsReturn?: boolean;
  incomeIsReturn?: boolean;
}

export function flattenPandLSideTree(
  tree: PandLTreeNode[],
  expandedIds: Set<string>,
): Array<{ item: PandLLineItem; depth: number }> {
  const rows: Array<{ item: PandLLineItem; depth: number }> = [];
  const walk = (nodes: PandLTreeNode[]) => {
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

export function flattenPandLHorizontalForExport(
  statement: PandLStatement,
  expandedIds: Set<string>,
): PandLHorizontalExportRow[] {
  const { expenses, income } = splitPandLHorizontal(statement);
  const leftRows = flattenPandLSideTree(expenses.tree, expandedIds);
  const rightRows = flattenPandLSideTree(income.tree, expandedIds);

  if (expenses.netBalanceRow) {
    leftRows.push({ item: expenses.netBalanceRow, depth: 0 });
  }
  if (income.netBalanceRow) {
    rightRows.push({ item: income.netBalanceRow, depth: 0 });
  }

  const maxLen = Math.max(leftRows.length, rightRows.length);
  const rows: PandLHorizontalExportRow[] = [
    {
      expenseParticular: expenses.sectionTitle,
      expenseAmount: null,
      incomeParticular: income.sectionTitle,
      incomeAmount: null,
      rowType: "header",
      expenseIndent: 0,
      incomeIndent: 0,
      expenseBold: true,
      incomeBold: true,
    },
  ];

  for (let i = 0; i < maxLen; i++) {
    const left = leftRows[i];
    const right = rightRows[i];

    rows.push({
      expenseParticular: left?.item.particular ?? "",
      expenseAmount: left?.item.amount ?? null,
      incomeParticular: right?.item.particular ?? "",
      incomeAmount: right?.item.amount ?? null,
      rowType:
        left?.item.isNetBalance || right?.item.isNetBalance ? "net" : "line",
      expenseIndent: left?.depth ?? 0,
      incomeIndent: right?.depth ?? 0,
      expenseBold: Boolean(
        left && (left.item.isNetBalance || !left.item.ledgerId),
      ),
      incomeBold: Boolean(
        right && (right.item.isNetBalance || !right.item.ledgerId),
      ),
      expenseIsReturn: left?.item.isReturn,
      incomeIsReturn: right?.item.isReturn,
    });
  }

  rows.push({
    expenseParticular: expenses.grandTotalLabel,
    expenseAmount: expenses.grandTotal,
    incomeParticular: income.grandTotalLabel,
    incomeAmount: income.grandTotal,
    rowType: "total",
    expenseIndent: 0,
    incomeIndent: 0,
    expenseBold: true,
    incomeBold: true,
  });

  return rows;
}

export interface PandLExportRow {
  particular: string;
  amount: number | null;
  rowType: "section" | "line" | "total" | "net";
  indent: number;
}

export function flattenPandLForExport(statement: PandLStatement): PandLExportRow[] {
  const { expenses, income } = splitPandLHorizontal(statement);
  const allExpanded = new Set([
    ...collectPandLGroupIds(expenses.tree),
    ...collectPandLGroupIds(income.tree),
  ]);
  return flattenPandLHorizontalForExport(statement, allExpanded).flatMap((row) => {
    const rows: PandLExportRow[] = [];
    if (row.expenseParticular) {
      rows.push({
        particular: row.expenseParticular,
        amount: row.expenseAmount,
        rowType: row.rowType === "total" ? "total" : row.rowType === "net" ? "net" : "line",
        indent: row.expenseIndent,
      });
    }
    if (row.incomeParticular) {
      rows.push({
        particular: row.incomeParticular,
        amount: row.incomeAmount,
        rowType: row.rowType === "total" ? "total" : row.rowType === "net" ? "net" : "line",
        indent: row.incomeIndent,
      });
    }
    return rows;
  });
}

export {
  getPandLActivePartyOptions,
  getPandLBranchOptions,
  getPandLLedgerGroupOptions,
  getPandLLedgerOptions,
  getPandLPartyOptions,
  getPandLWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
};
