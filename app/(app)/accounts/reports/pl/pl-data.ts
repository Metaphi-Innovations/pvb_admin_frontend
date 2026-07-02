import { roundMoney } from "@/lib/accounts/money-format";

export type PandLRowKind = "section" | "line" | "total" | "net";

export interface PandLLineItem {
  id: string;
  particular: string;
  amount: number | null;
  kind: PandLRowKind;
  /** When true, amount reduces the section total (e.g. Sales Return, Purchase Return). */
  isReturn?: boolean;
}

export interface PandLStatement {
  lines: PandLLineItem[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  hasData: boolean;
}

export interface PandLFilterParams {
  search?: string;
}

/** Demo P&L line items for client approval / testing. */
const DEMO_PANDL_LINES: Omit<PandLLineItem, "amount">[] = [
  { id: "sec-income", particular: "Income", kind: "section" },
  { id: "sales", particular: "Sales Account", kind: "line" },
  { id: "sales-return", particular: "Sales Return (-)", kind: "line", isReturn: true },
  { id: "direct-income", particular: "Direct Income", kind: "line" },
  { id: "indirect-income", particular: "Indirect Income", kind: "line" },
  { id: "other-income", particular: "Other Income", kind: "line" },
  { id: "total-income", particular: "Total Income", kind: "total" },

  { id: "sec-expenses", particular: "Expenses", kind: "section" },
  { id: "purchase", particular: "Purchase Account", kind: "line" },
  { id: "purchase-return", particular: "Purchase Return (-)", kind: "line", isReturn: true },
  { id: "direct-expenses", particular: "Direct Expenses", kind: "line" },
  { id: "indirect-expenses", particular: "Indirect Expenses", kind: "line" },
  { id: "freight-inward", particular: "Freight Inward", kind: "line" },
  { id: "packing", particular: "Packing Expenses", kind: "line" },
  { id: "salary", particular: "Salary Expenses", kind: "line" },
  { id: "rent", particular: "Rent Expenses", kind: "line" },
  { id: "electricity", particular: "Electricity Expenses", kind: "line" },
  { id: "travelling", particular: "Travelling Expenses", kind: "line" },
  { id: "bank-charges", particular: "Bank Charges", kind: "line" },
  { id: "depreciation", particular: "Depreciation", kind: "line" },
  { id: "misc", particular: "Miscellaneous Expenses", kind: "line" },
  { id: "total-expenses", particular: "Total Expenses", kind: "total" },
];

const DEMO_AMOUNTS: Record<string, number> = {
  sales: 1_850_000,
  "sales-return": 75_000,
  "direct-income": 45_000,
  "indirect-income": 25_000,
  "other-income": 18_000,
  purchase: 1_020_000,
  "purchase-return": 40_000,
  "direct-expenses": 115_000,
  "indirect-expenses": 210_000,
  "freight-inward": 65_000,
  packing: 38_000,
  salary: 185_000,
  rent: 72_000,
  electricity: 28_000,
  travelling: 54_000,
  "bank-charges": 12_500,
  depreciation: 42_000,
  misc: 18_500,
};

function signedLineAmount(item: PandLLineItem): number {
  if (item.amount == null) return 0;
  return item.isReturn ? -item.amount : item.amount;
}

function buildDemoLines(): PandLLineItem[] {
  const incomeIds = ["sales", "sales-return", "direct-income", "indirect-income", "other-income"];
  const expenseIds = [
    "purchase", "purchase-return", "direct-expenses", "indirect-expenses",
    "freight-inward", "packing", "salary", "rent", "electricity",
    "travelling", "bank-charges", "depreciation", "misc",
  ];

  const totalIncome = roundMoney(
    incomeIds.reduce((sum, id) => {
      const amt = DEMO_AMOUNTS[id] ?? 0;
      return sum + (id === "sales-return" ? -amt : amt);
    }, 0),
  );
  const totalExpenses = roundMoney(
    expenseIds.reduce((sum, id) => {
      const amt = DEMO_AMOUNTS[id] ?? 0;
      return sum + (id === "purchase-return" ? -amt : amt);
    }, 0),
  );
  const netProfit = roundMoney(totalIncome - totalExpenses);

  return DEMO_PANDL_LINES.map((item) => {
    if (item.kind === "section") {
      return { ...item, amount: null };
    }
    if (item.id === "total-income") {
      return { ...item, amount: totalIncome };
    }
    if (item.id === "total-expenses") {
      return { ...item, amount: totalExpenses };
    }
    return { ...item, amount: DEMO_AMOUNTS[item.id] ?? 0 };
  }).concat([
    {
      id: "net-profit",
      particular: netProfit >= 0 ? "Net Profit" : "Net Loss",
      amount: Math.abs(netProfit),
      kind: "net",
    },
  ]);
}

export function buildPandLStatement(): PandLStatement {
  const lines = buildDemoLines();
  const totalIncome = lines.find((l) => l.id === "total-income")?.amount ?? 0;
  const totalExpenses = lines.find((l) => l.id === "total-expenses")?.amount ?? 0;
  const netLine = lines.find((l) => l.kind === "net");
  const netProfit =
    netLine && lines.find((l) => l.id === "total-income")
      ? roundMoney((totalIncome ?? 0) - (totalExpenses ?? 0))
      : 0;

  return {
    lines,
    totalIncome: totalIncome ?? 0,
    totalExpenses: totalExpenses ?? 0,
    netProfit,
    hasData: lines.length > 0,
  };
}

export function filterPandLStatement(
  statement: PandLStatement,
  filters: PandLFilterParams,
): PandLStatement {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return statement;

  const filteredLines: PandLLineItem[] = [];
  let currentSection: "income" | "expense" | null = null;
  const incomeMatches: PandLLineItem[] = [];
  const expenseMatches: PandLLineItem[] = [];

  for (const line of statement.lines) {
    if (line.kind === "section") {
      currentSection = line.particular === "Income" ? "income" : "expense";
      continue;
    }
    if (line.kind === "net") continue;

    const matches = line.particular.toLowerCase().includes(q);
    if (!matches) continue;

    if (currentSection === "income") incomeMatches.push(line);
    else if (currentSection === "expense") expenseMatches.push(line);
  }

  if (incomeMatches.length > 0) {
    filteredLines.push({ id: "sec-income", particular: "Income", amount: null, kind: "section" });
    filteredLines.push(...incomeMatches.filter((l) => l.kind === "line"));
    const totalIncome = roundMoney(
      incomeMatches.filter((l) => l.kind === "line").reduce((s, l) => s + signedLineAmount(l), 0),
    );
    filteredLines.push({
      id: "total-income",
      particular: "Total Income",
      amount: totalIncome,
      kind: "total",
    });
  }

  if (expenseMatches.length > 0) {
    filteredLines.push({ id: "sec-expenses", particular: "Expenses", amount: null, kind: "section" });
    filteredLines.push(...expenseMatches.filter((l) => l.kind === "line"));
    const totalExpenses = roundMoney(
      expenseMatches.filter((l) => l.kind === "line").reduce((s, l) => s + signedLineAmount(l), 0),
    );
    filteredLines.push({
      id: "total-expenses",
      particular: "Total Expenses",
      amount: totalExpenses,
      kind: "total",
    });
  }

  const totalIncome = filteredLines.find((l) => l.id === "total-income")?.amount ?? 0;
  const totalExpenses = filteredLines.find((l) => l.id === "total-expenses")?.amount ?? 0;
  const netProfit = roundMoney(totalIncome - totalExpenses);

  if (filteredLines.length > 0) {
    filteredLines.push({
      id: "net-profit",
      particular: netProfit >= 0 ? "Net Profit" : "Net Loss",
      amount: Math.abs(netProfit),
      kind: "net",
    });
  }

  return {
    lines: filteredLines,
    totalIncome,
    totalExpenses,
    netProfit,
    hasData: filteredLines.length > 0,
  };
}

export interface PandLExportRow {
  particular: string;
  amount: number | null;
  rowType: "section" | "line" | "total" | "net";
  indent: number;
}

export function flattenPandLForExport(statement: PandLStatement): PandLExportRow[] {
  return statement.lines.map((line) => ({
    particular: line.particular,
    amount: line.amount,
    rowType: line.kind,
    indent: 0,
  }));
}
