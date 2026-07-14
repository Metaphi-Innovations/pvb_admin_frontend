/**
 * Common export formatting engine for all Accounts reports.
 *
 * Enforces professional accounting statement formatting:
 * - Bold: report headers, column headings, primary/group/sub-group rows, grand totals
 * - Normal: ledger / line-item rows
 * - Hierarchy indentation: primary (0) → group (1) → sub-group (2) → ledger (3)
 * - Indian currency formatting (₹5,00,000.00) with right-aligned amount columns
 * - Identical layout for PDF (print) and Excel (HTML .xls) exports
 */

import { formatMoney } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  buildTAccountTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportReportToExcelHtml,
  exportReportToPdf,
  exportTabularReportToExcelHtml,
  exportTabularReportToPdf,
  formatExportAmount,
  hierarchyRowClass,
  indentParticular,
  openReportPrintWindow,
  todayExportDateSuffix,
  type HierarchyRowType,
  type ReportColumnHeader,
  type ReportDocumentOptions,
  type ReportHeaderOptions,
  type TAccountExportRow,
} from "@/lib/accounts/report-export-presentation";

/** Indent depth for each hierarchy level (matches on-screen COA tree). */
export const HIERARCHY_INDENT_LEVELS: Record<
  "primary" | "group" | "subgroup" | "ledger",
  number
> = {
  primary: 0,
  group: 1,
  subgroup: 2,
  ledger: 3,
};

/** Row types that render bold in exported reports. */
export const BOLD_HIERARCHY_ROW_TYPES: ReadonlySet<HierarchyRowType | "title"> = new Set([
  "title",
  "primary",
  "group",
  "subgroup",
  "header",
  "section",
  "subtotal",
  "total",
  "net",
  "summary",
]);

export function resolveHierarchyIndent(
  rowType: HierarchyRowType,
  explicitIndent?: number,
): number {
  if (explicitIndent != null) return Math.max(0, explicitIndent);
  switch (rowType) {
    case "primary":
      return HIERARCHY_INDENT_LEVELS.primary;
    case "group":
      return HIERARCHY_INDENT_LEVELS.group;
    case "subgroup":
      return HIERARCHY_INDENT_LEVELS.subgroup;
    case "line":
      return HIERARCHY_INDENT_LEVELS.ledger;
    default:
      return 0;
  }
}

export function isHierarchyRowBold(
  rowType: HierarchyRowType | "title",
  override?: boolean,
): boolean {
  if (override != null) return override;
  return BOLD_HIERARCHY_ROW_TYPES.has(rowType);
}

/** Map Trial Balance / COA flatten types to export hierarchy row types. */
export function mapCoaLevelToRowType(
  level: "primary" | "group" | "subgroup" | "ledger",
): HierarchyRowType {
  switch (level) {
    case "primary":
      return "primary";
    case "group":
      return "group";
    case "subgroup":
      return "subgroup";
    case "ledger":
      return "line";
  }
}

/** Format inline particular with amount: "Fixed Assets – ₹5,00,000.00" */
export function formatParticularWithAmount(
  label: string,
  amount: number | null | undefined,
  options?: { dashWhenZero?: boolean; isReturn?: boolean },
): string {
  if (!label.trim()) return formatExportAmount(amount, options);
  const formattedAmount = options?.dashWhenZero
    ? amount
      ? formatExportAmount(amount, options)
      : "—"
    : formatExportAmount(amount, options);
  if (!formattedAmount) return label;
  return `${label} – ${formattedAmount}`;
}

export function wrapBoldHtml(content: string, bold: boolean): string {
  return bold ? `<strong>${content}</strong>` : content;
}

export function buildIndentedParticularCellHtml(options: {
  label: string;
  indent: number;
  bold: boolean;
  /** Use CSS padding classes (preferred for Excel). When false, uses leading spaces. */
  useCssIndent?: boolean;
  className?: string;
}): string {
  const useCss = options.useCssIndent !== false;
  const indentClass = useCss ? `indent-${Math.min(options.indent, 3)}` : "";
  const extraClass = options.className ?? "";
  const classes = ["label", indentClass, extraClass, options.bold ? "bold" : ""]
    .filter(Boolean)
    .join(" ");
  const text = useCss
    ? escapeHtml(options.label)
    : escapeHtml(indentParticular(options.label, options.indent));
  return `<td class="${classes}">${wrapBoldHtml(text, options.bold)}</td>`;
}

export interface HierarchyTabularRow {
  rowType: HierarchyRowType;
  label: string;
  indent?: number;
  bold?: boolean;
  amounts: (number | null | undefined)[];
  dashWhenZero?: boolean;
  /** Raw HTML for columns between the label and amount columns. */
  middleCellsHtml?: string;
  /** Raw HTML for columns after the amount columns. */
  trailingCellsHtml?: string;
  rowClassExtra?: string;
  amountOptions?: { isReturn?: boolean };
}

export function buildAmountCellsHtml(
  amounts: (number | null | undefined)[],
  bold: boolean,
  options?: { dashWhenZero?: boolean; isReturn?: boolean },
): string {
  const innerTag = bold ? "strong" : "span";
  return amounts
    .map((amount) => {
      const formatted = options?.dashWhenZero
        ? amount
          ? formatExportAmount(amount, { isReturn: options?.isReturn })
          : "—"
        : formatExportAmount(amount ?? null, { isReturn: options?.isReturn });
      return `<td class="num${bold ? " bold" : ""}"><${innerTag}>${formatted}</${innerTag}></td>`;
    })
    .join("");
}

export function buildHierarchyTabularRowHtml(row: HierarchyTabularRow): string {
  const indent = resolveHierarchyIndent(row.rowType, row.indent);
  const bold = isHierarchyRowBold(row.rowType, row.bold);
  const rowClass = [hierarchyRowClass(row.rowType), row.rowClassExtra]
    .filter(Boolean)
    .join(" ");
  const labelCell = buildIndentedParticularCellHtml({
    label: row.label,
    indent,
    bold,
  });
  const middle = row.middleCellsHtml ?? "";
  const amounts = buildAmountCellsHtml(row.amounts, bold, {
    dashWhenZero: row.dashWhenZero,
    isReturn: row.amountOptions?.isReturn,
  });
  const trailing = row.trailingCellsHtml ?? "";
  return `<tr class="${rowClass}">${labelCell}${middle}${amounts}${trailing}</tr>`;
}

export function buildHierarchyTabularBodyHtml(rows: HierarchyTabularRow[]): string {
  return rows.map(buildHierarchyTabularRowHtml).join("");
}

export function buildGrandTotalRowHtml(options: {
  label?: string;
  labelColSpan?: number;
  amounts?: (number | null | undefined)[];
  middleCellsHtml?: string;
  trailingCellsHtml?: string;
  dashWhenZero?: boolean;
  rowClass?: string;
}): string {
  const label = options.label ?? "Grand Total";
  const colspan = options.labelColSpan ?? 1;
  const labelCell = `<td${colspan > 1 ? ` colspan="${colspan}"` : ""} class="label bold"><strong>${escapeHtml(label)}</strong></td>`;
  const middle = options.middleCellsHtml ?? "";
  const amounts = buildAmountCellsHtml(options.amounts ?? [], true, {
    dashWhenZero: options.dashWhenZero,
  });
  const trailing = options.trailingCellsHtml ?? "";
  const rowClass = options.rowClass ?? "total";
  return `<tr class="${rowClass}">${labelCell}${middle}${amounts}${trailing}</tr>`;
}

export interface HorizontalSideCell {
  particular: string;
  indent: number;
  amount: number | null;
  bold?: boolean;
  isReturn?: boolean;
}

export interface HorizontalTAccountRow {
  rowType: HierarchyRowType | "title";
  left: HorizontalSideCell;
  right: HorizontalSideCell;
  rowClassExtra?: string;
}

function resolveSideBold(
  side: HorizontalSideCell,
  rowType: HierarchyRowType | "title",
): boolean {
  if (side.bold != null) return side.bold;
  if (rowType === "line") return false;
  return isHierarchyRowBold(rowType);
}

function formatHorizontalAmount(amount: number | null, isReturn?: boolean): string {
  if (amount == null) return "";
  return formatExportAmount(amount, { isReturn });
}

export function buildHorizontalTAccountRowHtml(row: HorizontalTAccountRow): string {
  const rowClass = [hierarchyRowClass(row.rowType), row.rowClassExtra]
    .filter(Boolean)
    .join(" ");
  const leftBold = resolveSideBold(row.left, row.rowType);
  const rightBold = resolveSideBold(row.right, row.rowType);
  const leftLabel = escapeHtml(indentParticular(row.left.particular, row.left.indent));
  const rightLabel = escapeHtml(indentParticular(row.right.particular, row.right.indent));
  const leftAmount = formatHorizontalAmount(row.left.amount, row.left.isReturn);
  const rightAmount = formatHorizontalAmount(row.right.amount, row.right.isReturn);

  if (row.rowType === "title") {
    return `<tr class="${rowClass}">
      <td class="label bold" colspan="2">${leftLabel}</td>
      <td class="divider"></td>
      <td class="label" colspan="2"></td>
    </tr>`;
  }

  return `<tr class="${rowClass}">
    <td class="label${leftBold ? " bold" : ""}">${wrapBoldHtml(leftLabel, leftBold)}</td>
    <td class="num${leftBold ? " bold" : ""}">${wrapBoldHtml(leftAmount, leftBold)}</td>
    <td class="divider"></td>
    <td class="label${rightBold ? " bold" : ""}">${wrapBoldHtml(rightLabel, rightBold)}</td>
    <td class="num${rightBold ? " bold" : ""}">${wrapBoldHtml(rightAmount, rightBold)}</td>
  </tr>`;
}

export function buildHorizontalTAccountBodyHtml(rows: HorizontalTAccountRow[]): string {
  return rows.map(buildHorizontalTAccountRowHtml).join("");
}

export function buildTAccountExportRowHtml(row: TAccountExportRow): string {
  const leftBold = row.leftBold ?? isHierarchyRowBold(row.rowType, undefined);
  const rightBold = row.rightBold ?? (row.rowType === "line" ? false : isHierarchyRowBold(row.rowType));
  return buildHorizontalTAccountRowHtml({
    rowType: row.rowType,
    left: {
      particular: row.leftParticular,
      indent: row.leftIndent,
      amount: row.leftAmount,
      bold: leftBold,
    },
    right: {
      particular: row.rightParticular,
      indent: row.rightIndent,
      amount: row.rightAmount,
      bold: rightBold,
    },
  });
}

export interface AccountsReportExportConfig {
  title: string;
  filename: string;
  header: ReportHeaderOptions;
  columns?: ReportColumnHeader[];
  bodyHtml: string;
  footerHtml?: string;
  footerNote?: string;
  landscape?: boolean;
  compact?: boolean;
}

function toDocumentOptions(config: AccountsReportExportConfig): ReportDocumentOptions {
  return {
    title: config.title,
    header: config.header,
    bodyHtml: config.bodyHtml,
    footerHtml: config.footerNote
      ? `<p class="report-footer-note">${config.footerNote}</p>`
      : config.footerHtml,
    landscape: config.landscape,
    compact: config.compact,
  };
}

/** Unified PDF export for all accounting reports. */
export function exportAccountsReportToPdf(config: AccountsReportExportConfig): void {
  if (config.columns) {
    exportTabularReportToPdf({
      title: config.title,
      header: config.header,
      columns: config.columns,
      bodyHtml: config.bodyHtml,
      footerHtml: config.footerHtml,
      footerNote: config.footerNote,
      landscape: config.landscape,
    });
    return;
  }
  exportReportToPdf(toDocumentOptions(config));
}

/** Unified Excel export for all accounting reports (HTML .xls with matching layout). */
export function exportAccountsReportToExcel(config: AccountsReportExportConfig): void {
  const filename = config.filename.endsWith(".xls")
    ? config.filename
    : `${config.filename}_${todayExportDateSuffix()}.xls`;

  if (config.columns) {
    exportTabularReportToExcelHtml({
      title: config.title,
      header: config.header,
      columns: config.columns,
      bodyHtml: config.bodyHtml,
      footerHtml: config.footerHtml,
      footerNote: config.footerNote,
      filename,
    });
    return;
  }

  exportReportToExcelHtml(toDocumentOptions(config), filename);
}

export function buildTabularReportBodyHtml(options: {
  columns: ReportColumnHeader[];
  bodyHtml: string;
  footerHtml?: string;
  tableClass?: string;
}): string {
  return buildStandardReportTableHtml(options);
}

export function buildTAccountReportBodyHtml(options: {
  leftTitle: string;
  leftAmountHeader: string;
  rightTitle: string;
  rightAmountHeader: string;
  rows: HorizontalTAccountRow[] | TAccountExportRow[];
}): string {
  const rowsHtml =
    options.rows.length > 0 && "leftParticular" in options.rows[0]
      ? (options.rows as TAccountExportRow[]).map(buildTAccountExportRowHtml).join("")
      : buildHorizontalTAccountBodyHtml(options.rows as HorizontalTAccountRow[]);

  return buildTAccountTableHtml({
    leftTitle: options.leftTitle,
    leftAmountHeader: options.leftAmountHeader,
    rightTitle: options.rightTitle,
    rightAmountHeader: options.rightAmountHeader,
    rowsHtml,
  });
}

export {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  downloadReportExcelHtml,
  escapeHtml,
  formatExportAmount,
  openReportPrintWindow,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
};
