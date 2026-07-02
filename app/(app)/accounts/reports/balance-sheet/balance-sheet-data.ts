import { roundMoney } from "@/lib/accounts/money-format";

export type BalanceSheetRowKind = "section" | "line" | "total";

export interface BalanceSheetLineItem {
  id: string;
  particular: string;
  amount: number | null;
  kind: BalanceSheetRowKind;
  section?: "liabilities" | "assets";
}

export interface BalanceSheetStatement {
  lines: BalanceSheetLineItem[];
  totalLiabilities: number;
  totalAssets: number;
  difference: number;
  isBalanced: boolean;
  hasData: boolean;
}

export interface BalanceSheetFilterParams {
  search?: string;
}

/** Demo Balance Sheet line items for client approval / testing. */
const DEMO_BS_LINES: Omit<BalanceSheetLineItem, "amount">[] = [
  { id: "sec-liabilities", particular: "Liabilities", kind: "section", section: "liabilities" },
  { id: "capital", particular: "Capital Account", kind: "line", section: "liabilities" },
  { id: "reserves", particular: "Reserves & Surplus", kind: "line", section: "liabilities" },
  { id: "secured-loans", particular: "Secured Loans", kind: "line", section: "liabilities" },
  { id: "unsecured-loans", particular: "Unsecured Loans", kind: "line", section: "liabilities" },
  { id: "current-liabilities", particular: "Current Liabilities", kind: "line", section: "liabilities" },
  { id: "sundry-creditors", particular: "Sundry Creditors", kind: "line", section: "liabilities" },
  { id: "gst-payable", particular: "GST Payable", kind: "line", section: "liabilities" },
  { id: "tds-payable", particular: "TDS Payable", kind: "line", section: "liabilities" },
  { id: "duties-taxes", particular: "Duties & Taxes", kind: "line", section: "liabilities" },
  { id: "other-liabilities", particular: "Other Liabilities", kind: "line", section: "liabilities" },
  { id: "total-liabilities", particular: "Total Liabilities", kind: "total", section: "liabilities" },

  { id: "sec-assets", particular: "Assets", kind: "section", section: "assets" },
  { id: "fixed-assets", particular: "Fixed Assets", kind: "line", section: "assets" },
  { id: "plant-machinery", particular: "Plant & Machinery", kind: "line", section: "assets" },
  { id: "furniture", particular: "Furniture & Fixtures", kind: "line", section: "assets" },
  { id: "computer-it", particular: "Computer & IT Equipment", kind: "line", section: "assets" },
  { id: "investments", particular: "Investments", kind: "line", section: "assets" },
  { id: "current-assets", particular: "Current Assets", kind: "line", section: "assets" },
  { id: "sundry-debtors", particular: "Sundry Debtors", kind: "line", section: "assets" },
  { id: "bank-accounts", particular: "Bank Accounts", kind: "line", section: "assets" },
  { id: "cash-in-hand", particular: "Cash in Hand", kind: "line", section: "assets" },
  { id: "loans-advances", particular: "Loans & Advances", kind: "line", section: "assets" },
  { id: "closing-stock", particular: "Closing Stock", kind: "line", section: "assets" },
  { id: "other-assets", particular: "Other Assets", kind: "line", section: "assets" },
  { id: "total-assets", particular: "Total Assets", kind: "total", section: "assets" },
];

const DEMO_AMOUNTS: Record<string, number> = {
  capital: 1_250_000,
  reserves: 475_000,
  "secured-loans": 800_000,
  "unsecured-loans": 350_000,
  "current-liabilities": 225_000,
  "sundry-creditors": 680_000,
  "gst-payable": 115_000,
  "tds-payable": 42_000,
  "duties-taxes": 58_000,
  "other-liabilities": 75_000,
  "fixed-assets": 950_000,
  "plant-machinery": 725_000,
  furniture: 180_000,
  "computer-it": 240_000,
  investments: 300_000,
  "current-assets": 375_000,
  "sundry-debtors": 690_000,
  "bank-accounts": 285_000,
  "cash-in-hand": 65_000,
  "loans-advances": 80_000,
  "closing-stock": 100_000,
  "other-assets": 80_000,
};

const LIABILITY_LINE_IDS = [
  "capital",
  "reserves",
  "secured-loans",
  "unsecured-loans",
  "current-liabilities",
  "sundry-creditors",
  "gst-payable",
  "tds-payable",
  "duties-taxes",
  "other-liabilities",
];

const ASSET_LINE_IDS = [
  "fixed-assets",
  "plant-machinery",
  "furniture",
  "computer-it",
  "investments",
  "current-assets",
  "sundry-debtors",
  "bank-accounts",
  "cash-in-hand",
  "loans-advances",
  "closing-stock",
  "other-assets",
];

function sumLineAmounts(ids: string[]): number {
  return roundMoney(ids.reduce((sum, id) => sum + (DEMO_AMOUNTS[id] ?? 0), 0));
}

function buildDemoLines(): BalanceSheetLineItem[] {
  const totalLiabilities = sumLineAmounts(LIABILITY_LINE_IDS);
  const totalAssets = sumLineAmounts(ASSET_LINE_IDS);

  return DEMO_BS_LINES.map((item) => {
    if (item.kind === "section") {
      return { ...item, amount: null };
    }
    if (item.id === "total-liabilities") {
      return { ...item, amount: totalLiabilities };
    }
    if (item.id === "total-assets") {
      return { ...item, amount: totalAssets };
    }
    return { ...item, amount: DEMO_AMOUNTS[item.id] ?? 0 };
  });
}

export function buildBalanceSheetStatement(): BalanceSheetStatement {
  const lines = buildDemoLines();
  const totalLiabilities = lines.find((l) => l.id === "total-liabilities")?.amount ?? 0;
  const totalAssets = lines.find((l) => l.id === "total-assets")?.amount ?? 0;
  const difference = roundMoney(totalAssets - totalLiabilities);

  return {
    lines,
    totalLiabilities,
    totalAssets,
    difference,
    isBalanced: difference === 0,
    hasData: lines.length > 0,
  };
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

  const filteredLines: BalanceSheetLineItem[] = [];

  if (liabilityMatches.length > 0) {
    filteredLines.push({
      id: "sec-liabilities",
      particular: "Liabilities",
      amount: null,
      kind: "section",
      section: "liabilities",
    });
    filteredLines.push(...liabilityMatches);
    const totalLiabilities = roundMoney(
      liabilityMatches.reduce((s, l) => s + (l.amount ?? 0), 0),
    );
    filteredLines.push({
      id: "total-liabilities",
      particular: "Total Liabilities",
      amount: totalLiabilities,
      kind: "total",
      section: "liabilities",
    });
  }

  if (assetMatches.length > 0) {
    filteredLines.push({
      id: "sec-assets",
      particular: "Assets",
      amount: null,
      kind: "section",
      section: "assets",
    });
    filteredLines.push(...assetMatches);
    const totalAssets = roundMoney(assetMatches.reduce((s, l) => s + (l.amount ?? 0), 0));
    filteredLines.push({
      id: "total-assets",
      particular: "Total Assets",
      amount: totalAssets,
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
    isBalanced: difference === 0,
    hasData: filteredLines.length > 0,
  };
}

export interface BalanceSheetExportRow {
  particular: string;
  amount: number | null;
  rowType: "section" | "line" | "total" | "footer";
  indent: number;
}

export function flattenBalanceSheetForExport(
  statement: BalanceSheetStatement,
): BalanceSheetExportRow[] {
  const rows: BalanceSheetExportRow[] = statement.lines.map((line) => ({
    particular: line.particular,
    amount: line.amount,
    rowType: line.kind,
    indent: line.kind === "line" ? 1 : 0,
  }));

  rows.push(
    { particular: "Total Assets", amount: statement.totalAssets, rowType: "footer", indent: 0 },
    {
      particular: "Total Liabilities",
      amount: statement.totalLiabilities,
      rowType: "footer",
      indent: 0,
    },
    { particular: "Difference", amount: statement.difference, rowType: "footer", indent: 0 },
    {
      particular: statement.isBalanced
        ? "Balance Sheet is balanced"
        : "Balance Sheet is not balanced",
      amount: null,
      rowType: "footer",
      indent: 0,
    },
  );

  return rows;
}
