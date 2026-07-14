import { GENERAL_LEDGER_HREF } from "@/lib/accounts/general-ledger-data";
import {
  computeCashFlowStatement,
  type CashFlowFilters,
  type CashFlowLineContribution,
} from "@/lib/accounts/cash-flow-compute";
import {
  CASH_FLOW_FINANCING_DISPLAY_IDS,
  CASH_FLOW_INVESTING_DISPLAY_IDS,
  CASH_FLOW_LINE_LABELS,
  CASH_FLOW_OPERATING_DISPLAY_IDS,
  cashFlowLineSection,
  type CashFlowLineId,
} from "@/lib/accounts/cash-flow-coa-mapping";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";

export type { CashFlowFilters } from "@/lib/accounts/cash-flow-compute";

export type CashFlowRowKind =
  | "title"
  | "section"
  | "line"
  | "total"
  | "divider"
  | "summary";

export type CashFlowSection = "operating" | "investing" | "financing" | "summary";

export interface CashFlowLineItem {
  id: string;
  particular: string;
  amount: number | null;
  previousAmount?: number | null;
  kind: CashFlowRowKind;
  section?: CashFlowSection;
  indent: number;
  sortOrder: number;
  ledgerId?: number;
  drillDownHref?: string;
  previousDrillDownHref?: string;
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
  comparePreviousPeriod?: boolean;
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
  previousNetOperating?: number;
  previousNetInvesting?: number;
  previousNetFinancing?: number;
  previousNetChange?: number;
  previousOpeningBalance?: number;
  previousClosingBalance?: number;
}

export interface CashFlowBuildOptions {
  comparePreviousPeriod?: boolean;
}

export interface CashFlowFilterParams {
  search?: string;
}

export interface CashFlowDrillDownFilters {
  dateFrom: string;
  dateTo: string;
  branch?: string;
  warehouse?: string;
  partyId?: string;
}

/** Shift an ISO date by calendar years (e.g. 2026-04-01 → 2025-04-01). */
export function shiftCashFlowIsoDateByYears(iso: string, years: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const nextYear = y + years;
  return `${String(nextYear).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function computeCashFlowPreviousPeriod(dateFrom: string, dateTo: string): {
  dateFrom: string;
  dateTo: string;
} {
  return {
    dateFrom: shiftCashFlowIsoDateByYears(dateFrom, -1),
    dateTo: shiftCashFlowIsoDateByYears(dateTo, -1),
  };
}

export function formatCashFlowPeriodDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatCashFlowPeriodLabel(dateFrom: string, dateTo: string): string {
  return `${formatCashFlowPeriodDate(dateFrom)} to ${formatCashFlowPeriodDate(dateTo)}`;
}

function lineCarriesAmount(kind: CashFlowRowKind): boolean {
  return kind === "line" || kind === "total" || kind === "summary";
}

/** Display signed amounts — negatives shown in brackets (Tally/Busy style). */
export function formatSignedCashFlowAmount(amount: number | null): string {
  if (amount == null) return "";
  if (amount === 0) return formatMoney(0);
  if (amount < 0) return `(${formatMoney(Math.abs(amount))})`;
  return formatMoney(amount);
}

let sortCounter = 0;
function nextSortOrder(): number {
  sortCounter += 1;
  return sortCounter;
}

function resetSortOrder(): void {
  sortCounter = 0;
}

function resolveDrillLedgerId(
  lineId: CashFlowLineId,
  dominantLedgerByLine: Partial<Record<CashFlowLineId, number>>,
  contributions: Record<CashFlowLineId, CashFlowLineContribution[]>,
  fallbackLedgerId: number | null,
): number | null {
  return (
    dominantLedgerByLine[lineId] ??
    contributions[lineId]?.[0]?.ledgerId ??
    fallbackLedgerId
  );
}

function buildSectionLines(
  section: CashFlowSection,
  sectionTitle: string,
  lineIds: CashFlowLineId[],
  amounts: Record<CashFlowLineId, number>,
  totalId: string,
  totalTitle: string,
  totalAmount: number,
  drillDownFilters: CashFlowDrillDownFilters,
  dominantLedgerByLine: Partial<Record<CashFlowLineId, number>>,
  contributions: Record<CashFlowLineId, CashFlowLineContribution[]>,
  fallbackLedgerId: number | null,
): CashFlowLineItem[] {
  const lines: CashFlowLineItem[] = [
    {
      id: `sec-${section}`,
      particular: sectionTitle,
      amount: null,
      kind: "section",
      section,
      indent: 0,
      sortOrder: nextSortOrder(),
    },
  ];

  for (const lineId of lineIds) {
    const ledgerId = resolveDrillLedgerId(
      lineId,
      dominantLedgerByLine,
      contributions,
      fallbackLedgerId,
    );
    lines.push({
      id: lineId,
      particular: CASH_FLOW_LINE_LABELS[lineId],
      amount: amounts[lineId] ?? 0,
      kind: "line",
      section,
      indent: 1,
      sortOrder: nextSortOrder(),
      ledgerId: ledgerId ?? undefined,
      drillDownHref: ledgerId
        ? buildCashFlowLedgerHref(ledgerId, drillDownFilters)
        : undefined,
    });
  }

  lines.push({
    id: totalId,
    particular: totalTitle,
    amount: totalAmount,
    kind: "total",
    section,
    indent: 0,
    sortOrder: nextSortOrder(),
  });

  lines.push({
    id: `divider-after-${section}`,
    particular: "",
    amount: null,
    kind: "divider",
    section,
    indent: 0,
    sortOrder: nextSortOrder(),
  });

  return lines;
}

export function buildCashFlowLedgerHref(
  ledgerId: number,
  filters: CashFlowDrillDownFilters,
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
  params.set("source", "cash-flow");
  return `${GENERAL_LEDGER_HREF}?${params.toString()}`;
}

export function buildCashFlowStatement(
  filters: CashFlowFilters,
  options?: CashFlowBuildOptions,
): CashFlowStatement {
  const current = buildSinglePeriodCashFlowStatement(filters);
  if (!options?.comparePreviousPeriod) return current;

  const previousPeriod = computeCashFlowPreviousPeriod(filters.dateFrom, filters.dateTo);
  const previousFilters: CashFlowFilters = {
    ...filters,
    dateFrom: previousPeriod.dateFrom,
    dateTo: previousPeriod.dateTo,
  };
  const previous = buildSinglePeriodCashFlowStatement(previousFilters);
  const previousById = new Map(previous.lines.map((line) => [line.id, line]));

  const lines = current.lines.map((line) => {
    if (!lineCarriesAmount(line.kind)) return line;
    const previousLine = previousById.get(line.id);
    return {
      ...line,
      previousAmount: previousLine?.amount ?? 0,
      previousDrillDownHref: previousLine?.drillDownHref,
    };
  });

  return {
    ...current,
    lines,
    comparePreviousPeriod: true,
    currentPeriodLabel: formatCashFlowPeriodLabel(filters.dateFrom, filters.dateTo),
    previousPeriodLabel: formatCashFlowPeriodLabel(
      previousPeriod.dateFrom,
      previousPeriod.dateTo,
    ),
    previousNetOperating: previous.netOperating,
    previousNetInvesting: previous.netInvesting,
    previousNetFinancing: previous.netFinancing,
    previousNetChange: previous.netChange,
    previousOpeningBalance: previous.openingBalance,
    previousClosingBalance: previous.closingBalance,
  };
}

function buildSinglePeriodCashFlowStatement(filters: CashFlowFilters): CashFlowStatement {
  resetSortOrder();
  const computed = computeCashFlowStatement(filters);
  const { lineAmounts, dominantLedgerByLine, lineContributions } = computed;

  const drillDownFilters: CashFlowDrillDownFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    branch: Array.isArray(filters.branch) ? filters.branch[0] : filters.branch,
    warehouse: Array.isArray(filters.warehouse) ? filters.warehouse[0] : filters.warehouse,
    partyId: Array.isArray(filters.partyId) ? filters.partyId[0] : filters.partyId,
  };

  const fallbackLedgerId = computed.primaryCashLedgerId;
  const netChangeLabel =
    computed.netChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";

  const cashPositionHref = fallbackLedgerId
    ? buildCashFlowLedgerHref(fallbackLedgerId, drillDownFilters)
    : undefined;

  const lines: CashFlowLineItem[] = [
    {
      id: "report-title",
      particular: "Cash Flow Statement",
      amount: null,
      kind: "title",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
    ...buildSectionLines(
      "operating",
      "Cash Flow from Operating Activities",
      CASH_FLOW_OPERATING_DISPLAY_IDS,
      lineAmounts,
      "net-operating",
      "Net Cash from Operating Activities",
      computed.netOperating,
      drillDownFilters,
      dominantLedgerByLine,
      lineContributions,
      fallbackLedgerId,
    ),
    ...buildSectionLines(
      "investing",
      "Cash Flow from Investing Activities",
      CASH_FLOW_INVESTING_DISPLAY_IDS,
      lineAmounts,
      "net-investing",
      "Net Cash from Investing Activities",
      computed.netInvesting,
      drillDownFilters,
      dominantLedgerByLine,
      lineContributions,
      fallbackLedgerId,
    ),
    ...buildSectionLines(
      "financing",
      "Cash Flow from Financing Activities",
      CASH_FLOW_FINANCING_DISPLAY_IDS,
      lineAmounts,
      "net-financing",
      "Net Cash from Financing Activities",
      computed.netFinancing,
      drillDownFilters,
      dominantLedgerByLine,
      lineContributions,
      fallbackLedgerId,
    ),
    {
      id: "divider-before-summary",
      particular: "",
      amount: null,
      kind: "divider",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
    {
      id: "opening-balance",
      particular: "Opening Cash & Bank Balance",
      amount: computed.openingBalance,
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
      drillDownHref: cashPositionHref,
    },
    {
      id: "net-change",
      particular: netChangeLabel,
      amount: computed.netChange,
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
    {
      id: "closing-balance",
      particular: "Closing Cash & Bank Balance",
      amount: computed.closingBalance,
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
      drillDownHref: cashPositionHref,
    },
  ];

  return {
    lines,
    netOperating: computed.netOperating,
    netInvesting: computed.netInvesting,
    netFinancing: computed.netFinancing,
    netChange: computed.netChange,
    openingBalance: computed.openingBalance,
    closingBalance: computed.closingBalance,
    hasData: true,
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
  let order = matches[0]?.sortOrder ?? 0;

  return [
    {
      id: `sec-${sectionId}`,
      particular: sectionTitle,
      amount: null,
      kind: "section",
      section: sectionId,
      indent: 0,
      sortOrder: order++,
    },
    ...matches.map((m) => ({ ...m, sortOrder: order++ })),
    {
      id: totalId,
      particular: totalTitle,
      amount: total,
      kind: "total",
      section: sectionId,
      indent: 0,
      sortOrder: order++,
    },
    {
      id: `divider-after-${sectionId}`,
      particular: "",
      amount: null,
      kind: "divider",
      section: sectionId,
      indent: 0,
      sortOrder: order++,
    },
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
    if (line.kind === "total" || line.kind === "summary" || line.kind === "divider" || line.kind === "title") {
      continue;
    }

    const matches = line.particular.toLowerCase().includes(q);
    if (!matches) continue;

    if (currentSection === "operating") operatingMatches.push(line);
    else if (currentSection === "investing") investingMatches.push(line);
    else if (currentSection === "financing") financingMatches.push(line);
  }

  resetSortOrder();
  const filteredLines: CashFlowLineItem[] = [
    {
      id: "report-title",
      particular: "Cash Flow Statement",
      amount: null,
      kind: "title",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
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

  if (filteredLines.length <= 1) {
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
      id: "divider-before-summary",
      particular: "",
      amount: null,
      kind: "divider",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
    {
      id: "opening-balance",
      particular: "Opening Cash & Bank Balance",
      amount: statement.openingBalance,
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
      drillDownHref: statement.lines.find((l) => l.id === "opening-balance")?.drillDownHref,
    },
    {
      id: "net-change",
      particular: netChangeLabel,
      amount: netChange,
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
    },
    {
      id: "closing-balance",
      particular: "Closing Cash & Bank Balance",
      amount: roundMoney(statement.openingBalance + netChange),
      kind: "summary",
      section: "summary",
      indent: 0,
      sortOrder: nextSortOrder(),
      drillDownHref: statement.lines.find((l) => l.id === "closing-balance")?.drillDownHref,
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
  previousAmount?: number | null;
  rowType: CashFlowRowKind;
  indent: number;
}

export function flattenCashFlowForExport(statement: CashFlowStatement): CashFlowExportRow[] {
  return statement.lines
    .filter((line) => line.kind !== "divider")
    .map((line) => ({
      particular: line.particular,
      amount: line.amount,
      previousAmount: statement.comparePreviousPeriod ? (line.previousAmount ?? null) : undefined,
      rowType: line.kind === "title" ? "section" : line.kind,
      indent: line.indent,
    }));
}

export {
  getCashFlowActivePartyOptions,
  getCashFlowBranchOptions,
  getCashFlowLedgerGroupOptions,
  getCashFlowLedgerOptions,
  getCashFlowWarehouseOptions,
  resolveFinancialYearLabel,
  resolvePartyFilterLabel,
} from "@/lib/accounts/cash-flow-compute";

export { cashFlowLineSection };
