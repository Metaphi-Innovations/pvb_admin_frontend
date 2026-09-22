/**
 * Map Cash Flow backend report → statement view model.
 * Copies backend amounts only — never recalculates nets/opening/closing.
 */
import { buildGeneralLedgerHref } from "@/lib/accounts/general-ledger-href";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { formatMoney, formatMoneyString } from "@/lib/accounts/money-format";
import type {
  CashFlowActivitySection,
  CashFlowDirection,
  CashFlowReportResult,
  CashFlowRow,
} from "@/types/cash-flow.types";

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
  /** Backend decimal string. Null for structural rows (title/section/divider). */
  amount: string | null;
  direction?: CashFlowDirection;
  kind: CashFlowRowKind;
  section?: CashFlowSection;
  indent: number;
  drillDownHref?: string;
}

export interface CashFlowStatement {
  lines: CashFlowLineItem[];
  netOperating: string;
  netInvesting: string;
  netFinancing: string;
  netChange: string;
  openingBalance: string;
  /** Official book closing = actual_closing_cash_bank from backend. */
  closingBalance: string;
  calculatedClosingBalance: string;
  reconciliationDifference: string;
  isReconciled: boolean;
  hasData: boolean;
}

export interface CashFlowDrillScope {
  financialYearId: string;
  fromDate: string;
  toDate: string;
  warehouseId?: string;
}

function isNegativeAmount(amount: string): boolean {
  const n = Number(amount);
  return Number.isFinite(n) && n < 0;
}

/**
 * Display formatting only.
 * Line rows: positive amount (direction explains nature).
 * Summary/net rows with signed=true: negatives in brackets (Tally-style).
 */
export function formatCashFlowDisplayAmount(
  amount: string | null | undefined,
  options?: { signed?: boolean },
): string {
  if (amount == null || amount === "") return formatMoney(0);
  if (options?.signed && isNegativeAmount(amount)) {
    return `(${formatMoneyString(amount)})`;
  }
  return formatMoneyString(amount);
}

export function formatCashFlowPeriodLabel(fromDate: string, toDate: string): string {
  return `${formatDisplayDate(fromDate, fromDate)} to ${formatDisplayDate(toDate, toDate)}`;
}

function netChangeLabel(netChange: string): string {
  return isNegativeAmount(netChange) ? "Net Decrease in Cash" : "Net Increase in Cash";
}

/**
 * Opening/closing drill-down only when the backend scope identifies exactly one
 * Cash/Bank ledger. Multi-ledger aggregates must not pretend to map to one ledger.
 */
function cashPositionHref(
  report: CashFlowReportResult,
  scope: CashFlowDrillScope,
): string | undefined {
  const ids = report.scope.cash_bank_ledger_ids ?? [];
  if (ids.length !== 1) return undefined;
  return buildGeneralLedgerHref({
    ledgerId: ids[0],
    fromDate: scope.fromDate,
    toDate: scope.toDate,
    financialYearId: scope.financialYearId,
    branch: scope.warehouseId,
    warehouse: scope.warehouseId,
    source: "cash-flow",
  });
}

function pushSection(
  lines: CashFlowLineItem[],
  section: CashFlowSection,
  title: string,
  activity: CashFlowActivitySection,
  netId: string,
  netTitle: string,
): void {
  lines.push({
    id: `sec-${section}`,
    particular: title,
    amount: null,
    kind: "section",
    section,
    indent: 0,
  });

  for (const row of activity.rows) {
    lines.push({
      id: row.code,
      particular: row.label,
      amount: row.amount,
      direction: row.direction,
      kind: "line",
      section,
      indent: 1,
    });
  }

  lines.push({
    id: netId,
    particular: netTitle,
    amount: activity.net,
    kind: "total",
    section,
    indent: 0,
  });

  lines.push({
    id: `divider-after-${section}`,
    particular: "",
    amount: null,
    kind: "divider",
    section,
    indent: 0,
  });
}

/**
 * Build the statement table from the backend report.
 * Section nets and summary values are copied from the API — not summed in the browser.
 */
export function toCashFlowStatement(
  report: CashFlowReportResult,
  drillScope?: CashFlowDrillScope,
): CashFlowStatement {
  const scope: CashFlowDrillScope = drillScope ?? {
    financialYearId: report.scope.financial_year_id,
    fromDate: report.scope.from_date,
    toDate: report.scope.to_date,
    warehouseId: report.scope.warehouse_id ?? undefined,
  };
  const cashHref = cashPositionHref(report, scope);
  const lines: CashFlowLineItem[] = [
    {
      id: "report-title",
      particular: "Cash Flow Statement",
      amount: null,
      kind: "title",
      indent: 0,
    },
  ];

  pushSection(
    lines,
    "operating",
    "Cash Flow from Operating Activities",
    report.operating_activities,
    "net-operating",
    "Net Cash from Operating Activities",
  );
  pushSection(
    lines,
    "investing",
    "Cash Flow from Investing Activities",
    report.investing_activities,
    "net-investing",
    "Net Cash from Investing Activities",
  );
  pushSection(
    lines,
    "financing",
    "Cash Flow from Financing Activities",
    report.financing_activities,
    "net-financing",
    "Net Cash from Financing Activities",
  );

  lines.push(
    {
      id: "divider-before-summary",
      particular: "",
      amount: null,
      kind: "divider",
      section: "summary",
      indent: 0,
    },
    {
      id: "opening-balance",
      particular: "Opening Cash & Bank Balance",
      amount: report.summary.opening_cash_bank,
      kind: "summary",
      section: "summary",
      indent: 0,
      drillDownHref: cashHref,
    },
    {
      id: "net-change",
      particular: netChangeLabel(report.summary.net_increase_decrease),
      amount: report.summary.net_increase_decrease,
      kind: "summary",
      section: "summary",
      indent: 0,
    },
    {
      id: "closing-balance",
      particular: "Closing Cash & Bank Balance",
      amount: report.summary.actual_closing_cash_bank,
      kind: "summary",
      section: "summary",
      indent: 0,
      drillDownHref: cashHref,
    },
  );

  return {
    lines,
    netOperating: report.summary.net_operating,
    netInvesting: report.summary.net_investing,
    netFinancing: report.summary.net_financing,
    netChange: report.summary.net_increase_decrease,
    openingBalance: report.summary.opening_cash_bank,
    closingBalance: report.summary.actual_closing_cash_bank,
    calculatedClosingBalance: report.summary.calculated_closing_cash_bank,
    reconciliationDifference: report.summary.reconciliation_difference,
    isReconciled: report.summary.is_reconciled,
    hasData: true,
  };
}

/** Test helper — find a rendered line by id/code. */
export function findStatementLine(
  statement: CashFlowStatement,
  id: string,
): CashFlowLineItem | undefined {
  return statement.lines.find((line) => line.id === id);
}

export function findActivityRow(
  section: CashFlowActivitySection,
  code: string,
): CashFlowRow | undefined {
  return section.rows.find((row) => row.code === code);
}
