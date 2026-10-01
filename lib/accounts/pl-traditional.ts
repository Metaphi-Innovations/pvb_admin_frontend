/**
 * Traditional four-column Profit & Loss statement builder (client Excel format).
 */

import { roundMoney } from "@/lib/accounts/money-format";
import type { PandLViewType } from "@/lib/accounts/pl-compute";

export type PandLDisplayRowType =
  | "group"
  | "ledger"
  | "carried"
  | "section_total"
  | "net"
  | "grand_total";

export interface PandLLedgerLine {
  id: string;
  particular: string;
  amount: number;
  isReturn?: boolean;
  ledgerId?: number;
  sortOrder: number;
}

export interface PandLAccountGroup {
  id: string;
  particular: string;
  sortOrder: number;
  ledgers: PandLLedgerLine[];
}

export interface PandLTraditionalSource {
  openingStock: PandLAccountGroup;
  purchaseAccounts: PandLAccountGroup;
  closingStock: PandLAccountGroup;
  salesAccounts: PandLAccountGroup;
  indirectExpenses: PandLAccountGroup;
  indirectIncomes: PandLAccountGroup;
  /** Additional direct expenses deducted in gross-profit calculation */
  directExpenses?: number;
}

export interface PandLSideDisplayRow {
  id: string;
  particular: string;
  rowType: PandLDisplayRowType;
  /** Parent / carried / total — far-right amount position */
  groupTotal?: number | null;
  /** Child ledger — inner-left amount position */
  ledgerAmount?: number | null;
  isReturn?: boolean;
  ledgerId?: number;
}

export interface PandLStatement {
  debitRows: PandLSideDisplayRow[];
  creditRows: PandLSideDisplayRow[];
  tradingTotal: number;
  grossProfit: number;
  netProfit: number;
  finalDebitTotal: number;
  finalCreditTotal: number;
  totalIncome: number;
  totalExpenses: number;
  isBalanced: boolean;
  hasData: boolean;
}

export type PandLTab = PandLViewType;

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

export interface PandLHorizontalExportRow {
  expenseParticular: string;
  expenseGroupTotal: number | null;
  expenseLedgerAmount: number | null;
  incomeParticular: string;
  incomeGroupTotal: number | null;
  incomeLedgerAmount: number | null;
  rowType: "line" | "net" | "total" | "section_total";
  expenseBold?: boolean;
  incomeBold?: boolean;
  expenseIsReturn?: boolean;
  incomeIsReturn?: boolean;
  expenseGroupBg?: boolean;
  incomeGroupBg?: boolean;
}

function sumGroupLedgers(group: PandLAccountGroup): number {
  return roundMoney(
    group.ledgers.reduce((sum, ledger) => {
      const signed = ledger.isReturn ? -ledger.amount : ledger.amount;
      return sum + signed;
    }, 0),
  );
}

function expandGroup(
  group: PandLAccountGroup,
  viewType: PandLViewType,
): PandLSideDisplayRow[] {
  const total = sumGroupLedgers(group);
  const rows: PandLSideDisplayRow[] = [
    {
      id: group.id,
      particular: group.particular,
      rowType: "group",
      groupTotal: total,
    },
  ];

  if (viewType === "detailed") {
    for (const ledger of [...group.ledgers].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.particular.localeCompare(b.particular),
    )) {
      rows.push({
        id: ledger.id,
        particular: ledger.particular,
        rowType: "ledger",
        ledgerAmount: ledger.amount,
        isReturn: ledger.isReturn,
        ledgerId: ledger.ledgerId,
      });
    }
  }

  return rows;
}

function carriedRow(id: string, particular: string, amount: number): PandLSideDisplayRow {
  return {
    id,
    particular,
    rowType: "carried",
    groupTotal: roundMoney(Math.abs(amount)),
  };
}

function sectionTotalRow(id: string, amount: number): PandLSideDisplayRow {
  return {
    id,
    particular: "Trading Total",
    rowType: "section_total",
    groupTotal: roundMoney(amount),
  };
}

function netRow(id: string, particular: string, amount: number): PandLSideDisplayRow {
  return {
    id,
    particular,
    rowType: "net",
    groupTotal: roundMoney(Math.abs(amount)),
  };
}

function grandTotalRow(id: string, amount: number): PandLSideDisplayRow {
  return {
    id,
    particular: "Total",
    rowType: "grand_total",
    groupTotal: roundMoney(amount),
  };
}

/** Build the traditional T-account P&L from source groups. */
export function buildTraditionalPandLStatement(
  source: PandLTraditionalSource,
  viewType: PandLViewType,
): PandLStatement {
  const openingTotal = sumGroupLedgers(source.openingStock);
  const purchaseTotal = sumGroupLedgers(source.purchaseAccounts);
  const closingTotal = sumGroupLedgers(source.closingStock);
  const salesTotal = sumGroupLedgers(source.salesAccounts);
  const indirectExpTotal = sumGroupLedgers(source.indirectExpenses);
  const indirectIncTotal = sumGroupLedgers(source.indirectIncomes);
  const directExp = source.directExpenses ?? 0;

  const grossProfit = roundMoney(
    salesTotal + closingTotal - openingTotal - purchaseTotal - directExp,
  );
  const isGrossProfit = grossProfit >= 0;
  const grossProfitAbs = roundMoney(Math.abs(grossProfit));

  const debitTrading: PandLSideDisplayRow[] = [
    ...expandGroup(source.openingStock, viewType),
    ...expandGroup(source.purchaseAccounts, viewType),
  ];
  const creditTrading: PandLSideDisplayRow[] = [
    ...expandGroup(source.closingStock, viewType),
    ...expandGroup(source.salesAccounts, viewType),
  ];

  if (isGrossProfit) {
    debitTrading.push(carriedRow("pl-gp-co", "Gross Profit c/o", grossProfitAbs));
  } else {
    creditTrading.push(carriedRow("pl-gl-co", "Gross Loss c/o", grossProfitAbs));
  }

  const tradingTotal = roundMoney(
    openingTotal + purchaseTotal + (isGrossProfit ? grossProfitAbs : 0),
  );

  debitTrading.push(sectionTotalRow("pl-trading-total-dr", tradingTotal));
  creditTrading.push(sectionTotalRow("pl-trading-total-cr", tradingTotal));

  const debitPl: PandLSideDisplayRow[] = [];
  const creditPl: PandLSideDisplayRow[] = [];

  if (isGrossProfit) {
    creditPl.push(carriedRow("pl-gp-bf", "Gross Profit b/f", grossProfitAbs));
  } else {
    debitPl.push(carriedRow("pl-gl-bf", "Gross Loss b/f", grossProfitAbs));
  }

  debitPl.push(...expandGroup(source.indirectExpenses, viewType));
  creditPl.push(...expandGroup(source.indirectIncomes, viewType));

  const netProfit = roundMoney(grossProfit + indirectIncTotal - indirectExpTotal);

  if (netProfit >= 0) {
    debitPl.push(netRow("pl-net-profit", "Net Profit", netProfit));
  } else {
    creditPl.push(netRow("pl-net-loss", "Net Loss", netProfit));
  }

  const plDebitSubtotal = roundMoney(
    (isGrossProfit ? 0 : grossProfitAbs) + indirectExpTotal + Math.max(netProfit, 0),
  );
  const plCreditSubtotal = roundMoney(
    (isGrossProfit ? grossProfitAbs : 0) + indirectIncTotal + Math.max(-netProfit, 0),
  );

  const finalDebitTotal = roundMoney(tradingTotal + plDebitSubtotal);
  const finalCreditTotal = roundMoney(tradingTotal + plCreditSubtotal);

  const debitRows = [...debitTrading, ...debitPl];
  const creditRows = [...creditTrading, ...creditPl];

  return {
    debitRows,
    creditRows,
    tradingTotal,
    grossProfit,
    netProfit,
    finalDebitTotal,
    finalCreditTotal,
    totalIncome: roundMoney(salesTotal + closingTotal + indirectIncTotal),
    totalExpenses: roundMoney(openingTotal + purchaseTotal + indirectExpTotal + directExp),
    isBalanced: finalDebitTotal === finalCreditTotal,
    hasData: true,
  };
}

function rowMatchesSearch(row: PandLSideDisplayRow, q: string, codes: Map<string, string>): boolean {
  const code = codes.get(row.id) ?? "";
  return (
    row.particular.toLowerCase().includes(q) ||
    code.includes(q) ||
    (Boolean(row.isReturn) && "return".includes(q))
  );
}

function filterSideRows(
  rows: PandLSideDisplayRow[],
  q: string,
  codes: Map<string, string>,
): PandLSideDisplayRow[] {
  if (!q) return rows;

  const groupChildMap = new Map<string, string[]>();
  let currentGroupId: string | null = null;

  for (const row of rows) {
    if (row.rowType === "group") {
      currentGroupId = row.id;
      groupChildMap.set(row.id, []);
    } else if (currentGroupId && row.rowType === "ledger") {
      groupChildMap.get(currentGroupId)!.push(row.id);
    } else {
      currentGroupId = null;
    }
  }

  const includeIds = new Set<string>();

  for (const row of rows) {
    if (rowMatchesSearch(row, q, codes)) {
      includeIds.add(row.id);
      if (row.rowType === "ledger") {
        for (const [groupId, childIds] of groupChildMap) {
          if (childIds.includes(row.id)) includeIds.add(groupId);
        }
      }
    }
  }

  return rows.filter((row) => {
    if (row.rowType === "section_total" || row.rowType === "grand_total") return true;
    if (row.rowType === "carried" || row.rowType === "net") {
      return row.particular.toLowerCase().includes(q) || includeIds.size > 0;
    }
    return includeIds.has(row.id);
  });
}

export function filterPandLStatement(
  statement: PandLStatement,
  filters: PandLFilterParams,
  codes: Map<string, string> = new Map(),
): PandLStatement {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return statement;

  const debitRows = filterSideRows(statement.debitRows, q, codes);
  const creditRows = filterSideRows(statement.creditRows, q, codes);

  return {
    ...statement,
    debitRows,
    creditRows,
    hasData: debitRows.length > 0 || creditRows.length > 0,
  };
}

function sideRowToExport(
  row: PandLSideDisplayRow,
  side: "debit" | "credit",
): Pick<
  PandLHorizontalExportRow,
  | "expenseParticular"
  | "expenseGroupTotal"
  | "expenseLedgerAmount"
  | "incomeParticular"
  | "incomeGroupTotal"
  | "incomeLedgerAmount"
  | "expenseBold"
  | "incomeBold"
  | "expenseIsReturn"
  | "incomeIsReturn"
  | "expenseGroupBg"
  | "incomeGroupBg"
> {
  const isGroup = row.rowType === "group";
  const isBold =
    isGroup ||
    row.rowType === "carried" ||
    row.rowType === "section_total" ||
    row.rowType === "net" ||
    row.rowType === "grand_total";

  const base = {
    expenseParticular: "",
    expenseGroupTotal: null as number | null,
    expenseLedgerAmount: null as number | null,
    incomeParticular: "",
    incomeGroupTotal: null as number | null,
    incomeLedgerAmount: null as number | null,
    expenseBold: false,
    incomeBold: false,
    expenseIsReturn: false,
    incomeIsReturn: false,
    expenseGroupBg: false,
    incomeGroupBg: false,
  };

  if (side === "debit") {
    return {
      ...base,
      expenseParticular: row.particular,
      expenseGroupTotal: row.groupTotal ?? null,
      expenseLedgerAmount: row.ledgerAmount ?? null,
      expenseBold: isBold,
      expenseIsReturn: row.isReturn,
      expenseGroupBg: isGroup,
    };
  }

  return {
    ...base,
    incomeParticular: row.particular,
    incomeGroupTotal: row.groupTotal ?? null,
    incomeLedgerAmount: row.ledgerAmount ?? null,
    incomeBold: isBold,
    incomeIsReturn: row.isReturn,
    incomeGroupBg: isGroup,
  };
}

export function flattenPandLHorizontalForExport(
  statement: PandLStatement,
): PandLHorizontalExportRow[] {
  const bodyDebit = statement.debitRows.filter((r) => r.rowType !== "grand_total");
  const bodyCredit = statement.creditRows.filter((r) => r.rowType !== "grand_total");

  const maxLen = Math.max(bodyDebit.length, bodyCredit.length);
  const rows: PandLHorizontalExportRow[] = [];

  for (let i = 0; i < maxLen; i++) {
    const left = bodyDebit[i];
    const right = bodyCredit[i];
    const leftExport = left ? sideRowToExport(left, "debit") : sideRowToExport(
      { id: "", particular: "", rowType: "ledger" },
      "debit",
    );
    const rightExport = right ? sideRowToExport(right, "credit") : sideRowToExport(
      { id: "", particular: "", rowType: "ledger" },
      "credit",
    );

    const rowType =
      left?.rowType === "section_total" || right?.rowType === "section_total"
        ? "section_total"
        : left?.rowType === "net" || right?.rowType === "net"
          ? "net"
          : "line";

    rows.push({
      expenseParticular: leftExport.expenseParticular,
      expenseGroupTotal: leftExport.expenseGroupTotal,
      expenseLedgerAmount: leftExport.expenseLedgerAmount,
      incomeParticular: rightExport.incomeParticular,
      incomeGroupTotal: rightExport.incomeGroupTotal,
      incomeLedgerAmount: rightExport.incomeLedgerAmount,
      rowType,
      expenseBold: leftExport.expenseBold,
      incomeBold: rightExport.incomeBold,
      expenseIsReturn: leftExport.expenseIsReturn,
      incomeIsReturn: rightExport.incomeIsReturn,
      expenseGroupBg: leftExport.expenseGroupBg,
      incomeGroupBg: rightExport.incomeGroupBg,
    });
  }

  rows.push({
    expenseParticular: "Total",
    expenseGroupTotal: statement.finalDebitTotal,
    expenseLedgerAmount: null,
    incomeParticular: "Total",
    incomeGroupTotal: statement.finalCreditTotal,
    incomeLedgerAmount: null,
    rowType: "total",
    expenseBold: true,
    incomeBold: true,
  });

  return rows;
}

export function buildEmptyPandLStatement(): PandLStatement {
  return {
    debitRows: [],
    creditRows: [],
    tradingTotal: 0,
    grossProfit: 0,
    netProfit: 0,
    finalDebitTotal: 0,
    finalCreditTotal: 0,
    totalIncome: 0,
    totalExpenses: 0,
    isBalanced: true,
    hasData: false,
  };
}
