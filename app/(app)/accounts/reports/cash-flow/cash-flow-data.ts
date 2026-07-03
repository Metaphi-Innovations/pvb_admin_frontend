import { formatMoney, roundMoney } from "@/lib/accounts/money-format";

export type CashFlowRowKind = "section" | "line" | "total" | "summary";

export type CashFlowSection = "operating" | "investing" | "financing" | "summary";

export interface CashFlowLineItem {
  id: string;
  particular: string;
  amount: number | null;
  kind: CashFlowRowKind;
  section?: CashFlowSection;
}

export interface CashFlowStatement {
  lines: CashFlowLineItem[];
  netOperating: number;
  netInvesting: number;
  netFinancing: number;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
  hasData: boolean;
}

export interface CashFlowFilterParams {
  search?: string;
}

/** Display signed amounts — negatives shown in brackets (Tally/Busy style). */
export function formatSignedCashFlowAmount(amount: number | null): string {
  if (amount == null) return "—";
  if (amount < 0) return `(${formatMoney(Math.abs(amount))})`;
  return formatMoney(amount);
}

const DEMO_CF_LINES: Omit<CashFlowLineItem, "amount">[] = [
  {
    id: "sec-operating",
    particular: "Cash Flow from Operating Activities",
    kind: "section",
    section: "operating",
  },
  { id: "cash-from-customers", particular: "Cash Received from Customers", kind: "line", section: "operating" },
  { id: "other-operating-receipts", particular: "Other Operating Receipts", kind: "line", section: "operating" },
  { id: "cash-paid-suppliers", particular: "Cash Paid to Suppliers", kind: "line", section: "operating" },
  { id: "cash-paid-employees", particular: "Cash Paid to Employees", kind: "line", section: "operating" },
  { id: "operating-expenses", particular: "Operating Expenses Paid", kind: "line", section: "operating" },
  { id: "gst-paid", particular: "GST Paid", kind: "line", section: "operating" },
  { id: "income-tax-paid", particular: "Income Tax Paid", kind: "line", section: "operating" },
  {
    id: "net-operating",
    particular: "Net Cash from Operating Activities",
    kind: "total",
    section: "operating",
  },

  {
    id: "sec-investing",
    particular: "Cash Flow from Investing Activities",
    kind: "section",
    section: "investing",
  },
  { id: "purchase-fixed-assets", particular: "Purchase of Fixed Assets", kind: "line", section: "investing" },
  { id: "sale-fixed-assets", particular: "Sale of Fixed Assets", kind: "line", section: "investing" },
  { id: "purchase-investments", particular: "Purchase of Investments", kind: "line", section: "investing" },
  {
    id: "net-investing",
    particular: "Net Cash from Investing Activities",
    kind: "total",
    section: "investing",
  },

  {
    id: "sec-financing",
    particular: "Cash Flow from Financing Activities",
    kind: "section",
    section: "financing",
  },
  { id: "capital-introduced", particular: "Capital Introduced", kind: "line", section: "financing" },
  { id: "loan-received", particular: "Loan Received", kind: "line", section: "financing" },
  { id: "loan-repaid", particular: "Loan Repaid", kind: "line", section: "financing" },
  { id: "interest-paid", particular: "Interest Paid", kind: "line", section: "financing" },
  {
    id: "net-financing",
    particular: "Net Cash from Financing Activities",
    kind: "total",
    section: "financing",
  },

  { id: "opening-balance", particular: "Opening Cash & Bank Balance", kind: "summary", section: "summary" },
  { id: "net-change", particular: "Net Increase in Cash", kind: "summary", section: "summary" },
  {
    id: "closing-balance",
    particular: "Closing Cash & Bank Balance",
    kind: "summary",
    section: "summary",
  },
];

/** Signed demo amounts — outflows are negative. */
const DEMO_AMOUNTS: Record<string, number> = {
  "cash-from-customers": 1_850_000,
  "other-operating-receipts": 45_000,
  "cash-paid-suppliers": -1_020_000,
  "cash-paid-employees": -185_000,
  "operating-expenses": -110_000,
  "gst-paid": -62_000,
  "income-tax-paid": -38_000,
  "purchase-fixed-assets": -240_000,
  "sale-fixed-assets": 60_000,
  "purchase-investments": -100_000,
  "capital-introduced": 500_000,
  "loan-received": 300_000,
  "loan-repaid": -120_000,
  "interest-paid": -45_000,
};

const OPERATING_LINE_IDS = [
  "cash-from-customers",
  "other-operating-receipts",
  "cash-paid-suppliers",
  "cash-paid-employees",
  "operating-expenses",
  "gst-paid",
  "income-tax-paid",
];

const INVESTING_LINE_IDS = ["purchase-fixed-assets", "sale-fixed-assets", "purchase-investments"];

const FINANCING_LINE_IDS = ["capital-introduced", "loan-received", "loan-repaid", "interest-paid"];

const OPENING_BALANCE = 850_000;

function sumSignedAmounts(ids: string[]): number {
  return roundMoney(ids.reduce((sum, id) => sum + (DEMO_AMOUNTS[id] ?? 0), 0));
}

function buildDemoLines(): CashFlowLineItem[] {
  const netOperating = sumSignedAmounts(OPERATING_LINE_IDS);
  const netInvesting = sumSignedAmounts(INVESTING_LINE_IDS);
  const netFinancing = sumSignedAmounts(FINANCING_LINE_IDS);
  const netChange = roundMoney(netOperating + netInvesting + netFinancing);
  const closingBalance = roundMoney(OPENING_BALANCE + netChange);

  const netChangeLabel =
    netChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";

  return DEMO_CF_LINES.map((item) => {
    if (item.kind === "section") {
      return { ...item, amount: null };
    }
    if (item.id === "net-operating") {
      return { ...item, amount: netOperating };
    }
    if (item.id === "net-investing") {
      return { ...item, amount: netInvesting };
    }
    if (item.id === "net-financing") {
      return { ...item, amount: netFinancing };
    }
    if (item.id === "opening-balance") {
      return { ...item, amount: OPENING_BALANCE };
    }
    if (item.id === "net-change") {
      return { ...item, particular: netChangeLabel, amount: netChange };
    }
    if (item.id === "closing-balance") {
      return { ...item, amount: closingBalance };
    }
    return { ...item, amount: DEMO_AMOUNTS[item.id] ?? 0 };
  });
}

export function buildCashFlowStatement(): CashFlowStatement {
  const lines = buildDemoLines();
  const netOperating = lines.find((l) => l.id === "net-operating")?.amount ?? 0;
  const netInvesting = lines.find((l) => l.id === "net-investing")?.amount ?? 0;
  const netFinancing = lines.find((l) => l.id === "net-financing")?.amount ?? 0;
  const netChange = lines.find((l) => l.id === "net-change")?.amount ?? 0;
  const openingBalance = lines.find((l) => l.id === "opening-balance")?.amount ?? 0;
  const closingBalance = lines.find((l) => l.id === "closing-balance")?.amount ?? 0;

  return {
    lines,
    netOperating,
    netInvesting,
    netFinancing,
    netChange,
    openingBalance,
    closingBalance,
    hasData: lines.length > 0,
  };
}

function rebuildSection(
  sectionId: CashFlowSection,
  sectionTitle: string,
  matches: CashFlowLineItem[],
  totalId: string,
  totalTitle: string,
): CashFlowLineItem[] {
  if (matches.length === 0) return [];

  const total = roundMoney(matches.reduce((s, l) => s + (l.amount ?? 0), 0));

  return [
    { id: `sec-${sectionId}`, particular: sectionTitle, amount: null, kind: "section", section: sectionId },
    ...matches,
    { id: totalId, particular: totalTitle, amount: total, kind: "total", section: sectionId },
  ];
}

export function filterCashFlowStatement(
  statement: CashFlowStatement,
  filters: CashFlowFilterParams,
): CashFlowStatement {
  const q = (filters.search ?? "").trim().toLowerCase();
  if (!q) return statement;

  const operatingMatches: CashFlowLineItem[] = [];
  const investingMatches: CashFlowLineItem[] = [];
  const financingMatches: CashFlowLineItem[] = [];
  let currentSection: CashFlowSection | null = null;

  for (const line of statement.lines) {
    if (line.kind === "section") {
      currentSection = line.section ?? null;
      continue;
    }
    if (line.kind === "total" || line.kind === "summary") continue;

    const matches = line.particular.toLowerCase().includes(q);
    if (!matches) continue;

    if (currentSection === "operating") operatingMatches.push(line);
    else if (currentSection === "investing") investingMatches.push(line);
    else if (currentSection === "financing") financingMatches.push(line);
  }

  const filteredLines: CashFlowLineItem[] = [
    ...rebuildSection(
      "operating",
      "Cash Flow from Operating Activities",
      operatingMatches,
      "net-operating",
      "Net Cash from Operating Activities",
    ),
    ...rebuildSection(
      "investing",
      "Cash Flow from Investing Activities",
      investingMatches,
      "net-investing",
      "Net Cash from Investing Activities",
    ),
    ...rebuildSection(
      "financing",
      "Cash Flow from Financing Activities",
      financingMatches,
      "net-financing",
      "Net Cash from Financing Activities",
    ),
  ];

  if (filteredLines.length === 0) {
    return {
      lines: [],
      netOperating: 0,
      netInvesting: 0,
      netFinancing: 0,
      netChange: 0,
      openingBalance: statement.openingBalance,
      closingBalance: statement.closingBalance,
      hasData: false,
    };
  }

  const netOperating = filteredLines.find((l) => l.id === "net-operating")?.amount ?? 0;
  const netInvesting = filteredLines.find((l) => l.id === "net-investing")?.amount ?? 0;
  const netFinancing = filteredLines.find((l) => l.id === "net-financing")?.amount ?? 0;
  const netChange = roundMoney(netOperating + netInvesting + netFinancing);
  const netChangeLabel = netChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";

  filteredLines.push(
    {
      id: "opening-balance",
      particular: "Opening Cash & Bank Balance",
      amount: statement.openingBalance,
      kind: "summary",
      section: "summary",
    },
    {
      id: "net-change",
      particular: netChangeLabel,
      amount: netChange,
      kind: "summary",
      section: "summary",
    },
    {
      id: "closing-balance",
      particular: "Closing Cash & Bank Balance",
      amount: roundMoney(statement.openingBalance + netChange),
      kind: "summary",
      section: "summary",
    },
  );

  return {
    lines: filteredLines,
    netOperating,
    netInvesting,
    netFinancing,
    netChange,
    openingBalance: statement.openingBalance,
    closingBalance: roundMoney(statement.openingBalance + netChange),
    hasData: true,
  };
}

export interface CashFlowExportRow {
  particular: string;
  amount: number | null;
  rowType: CashFlowRowKind;
  indent: number;
}

export function flattenCashFlowForExport(statement: CashFlowStatement): CashFlowExportRow[] {
  return statement.lines.map((line) => ({
    particular: line.particular,
    amount: line.amount,
    rowType: line.kind,
    indent: line.kind === "line" ? 1 : 0,
  }));
}
