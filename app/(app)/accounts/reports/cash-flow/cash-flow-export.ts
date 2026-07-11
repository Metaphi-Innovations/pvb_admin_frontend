import { formatMoney, formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  indentParticular,
  openReportPrintWindow,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import type { CashFlowExportRow, CashFlowStatement } from "./cash-flow-data";

const REPORT_NAME = "Cash Flow Statement";

export interface CashFlowExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Particular" },
  { label: "Amount (₹)", align: "right", className: "num" },
];

function formatExportAmount(amount: number | null): string {
  if (amount == null) return "";
  if (amount < 0) return `(${formatMoney(Math.abs(amount))})`;
  return formatMoney(amount);
}

function buildHeaderOptions(meta: CashFlowExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
  };
}

function buildTableBodyHtml(rows: CashFlowExportRow[]): string {
  return rows
    .map((r) => {
      const rowClass =
        r.rowType === "section"
          ? "section"
          : r.rowType === "total"
            ? "total"
            : r.rowType === "summary"
              ? `summary${r.particular === "Closing Cash & Bank Balance" ? " closing" : ""}`
              : "line";
      const label = escapeHtml(indentParticular(r.particular, r.indent));
      const amount = formatExportAmount(r.amount);
      return `<tr class="${rowClass}"><td class="label">${label}</td><td class="num">${amount}</td></tr>`;
    })
    .join("");
}

function buildCashFlowBody(rows: CashFlowExportRow[], statement: CashFlowStatement): string {
  const tableHtml = buildStandardReportTableHtml({
    columns: COLUMNS,
    bodyHtml: buildTableBodyHtml(rows),
  });
  const netChangeLabel =
    statement.netChange >= 0 ? "Net Increase in Cash" : "Net Decrease in Cash";
  const footerNote = `<p class="report-footer-note">
    ${netChangeLabel}: ₹ ${formatMoneyNumber(Math.abs(statement.netChange))} ·
    Closing Cash &amp; Bank Balance: ₹ ${formatMoneyNumber(statement.closingBalance)}
  </p>`;
  return tableHtml + footerNote;
}

export async function exportCashFlowToExcel(
  rows: CashFlowExportRow[],
  meta: CashFlowExportMeta,
  statement: CashFlowStatement,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildCashFlowBody(rows, statement),
  });
  downloadReportExcelHtml(html, `Cash_Flow_Statement_${todayExportDateSuffix()}.xls`);
}

export function exportCashFlowToPdf(
  rows: CashFlowExportRow[],
  meta: CashFlowExportMeta,
  statement: CashFlowStatement,
): void {
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildCashFlowBody(rows, statement),
  });
  openReportPrintWindow(html);
}
