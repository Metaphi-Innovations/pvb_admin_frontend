import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildHierarchyTabularBodyHtml,
  buildTabularReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  type HierarchyTabularRow,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import type { CashFlowExportRow, CashFlowStatement } from "./cash-flow-data";

const REPORT_NAME = "Cash Flow Statement";

export interface CashFlowExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  comparePreviousPeriod?: boolean;
  currentPeriodLabel?: string;
  previousPeriodLabel?: string;
}

function buildColumns(meta: CashFlowExportMeta): ReportColumnHeader[] {
  if (meta.comparePreviousPeriod) {
    return [
      { label: "Particulars" },
      {
        label: meta.currentPeriodLabel ? `${meta.currentPeriodLabel} (₹)` : "Current Period (₹)",
        align: "right",
        className: "num",
      },
      {
        label: meta.previousPeriodLabel ? `${meta.previousPeriodLabel} (₹)` : "Previous Period (₹)",
        align: "right",
        className: "num",
      },
    ];
  }

  return [
    { label: "Particulars" },
    { label: "Amount (₹)", align: "right", className: "num" },
  ];
}

function buildHeaderOptions(meta: CashFlowExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
  };
}

function toHierarchyRows(rows: CashFlowExportRow[], comparePreviousPeriod: boolean): HierarchyTabularRow[] {
  return rows.map((r) => ({
    rowType:
      r.rowType === "title" || r.rowType === "section"
        ? "section"
        : r.rowType === "total"
          ? "total"
          : r.rowType === "summary"
            ? "summary"
            : "line",
    label: r.particular,
    indent: r.indent,
    amounts: comparePreviousPeriod
      ? [r.amount, r.previousAmount ?? null]
      : [r.amount],
    rowClassExtra:
      r.rowType === "summary" && r.particular === "Closing Cash & Bank Balance"
        ? "closing"
        : undefined,
  }));
}

function buildCashFlowBody(
  rows: CashFlowExportRow[],
  statement: CashFlowStatement,
  meta: CashFlowExportMeta,
): string {
  const comparePreviousPeriod = Boolean(meta.comparePreviousPeriod);
  const columns = buildColumns(meta);
  const tableHtml = buildTabularReportBodyHtml({
    columns,
    bodyHtml: buildHierarchyTabularBodyHtml(
      toHierarchyRows(rows, comparePreviousPeriod),
    ),
  });
  const netChangeLabel =
    statement.netChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";
  const footerParts = [
    `${netChangeLabel}: ₹ ${formatMoneyNumber(Math.abs(statement.netChange))}`,
    `Closing Cash & Bank Balance: ₹ ${formatMoneyNumber(statement.closingBalance)}`,
  ];
  if (comparePreviousPeriod && statement.previousNetChange != null) {
    const prevNetChangeLabel =
      statement.previousNetChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";
    footerParts.push(
      `Previous ${prevNetChangeLabel}: ₹ ${formatMoneyNumber(Math.abs(statement.previousNetChange))}`,
    );
    if (statement.previousClosingBalance != null) {
      footerParts.push(
        `Previous Closing Cash & Bank Balance: ₹ ${formatMoneyNumber(statement.previousClosingBalance)}`,
      );
    }
  }
  const footerNote = `<p class="report-footer-note">${footerParts.join(" · ")}</p>`;
  return tableHtml + footerNote;
}

export async function exportCashFlowToExcel(
  rows: CashFlowExportRow[],
  meta: CashFlowExportMeta,
  statement: CashFlowStatement,
): Promise<void> {
  exportAccountsReportToExcel({
    title: REPORT_NAME,
    filename: "Cash_Flow_Statement",
    header: buildHeaderOptions(meta),
    bodyHtml: buildCashFlowBody(rows, statement, meta),
  });
}

export function exportCashFlowToPdf(
  rows: CashFlowExportRow[],
  meta: CashFlowExportMeta,
  statement: CashFlowStatement,
): void {
  exportAccountsReportToPdf({
    title: REPORT_NAME,
    filename: "Cash_Flow_Statement",
    header: buildHeaderOptions(meta),
    bodyHtml: buildCashFlowBody(rows, statement, meta),
  });
}
