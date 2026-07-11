import { formatMoney, formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildBalanceMessageHtml,
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildTAccountTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  indentParticular,
  openReportPrintWindow,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import type { PandLHorizontalExportRow, PandLStatement } from "./pl-data";

const REPORT_NAME = "Profit & Loss Account";

export interface PandLExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  branch?: string;
  warehouse?: string;
  party?: string;
  viewType?: string;
}

function formatExportAmount(amount: number | null, isReturn?: boolean): string {
  if (amount == null) return "";
  if (isReturn) return `(${formatMoney(amount)})`;
  if (amount < 0) return `(${formatMoney(Math.abs(amount))})`;
  return formatMoney(amount);
}

function buildHeaderOptions(meta: PandLExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear || "All years",
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch ?? "All branches" },
      { label: "Warehouse", value: meta.warehouse ?? "All warehouses" },
      { label: "Party", value: meta.party ?? "All parties" },
      { label: "View Type", value: meta.viewType ?? "Summary" },
    ],
  };
}

function buildTableRowsHtml(rows: PandLHorizontalExportRow[]): string {
  return rows
    .map((r) => {
      const rowClass =
        r.rowType === "title"
          ? "title"
          : r.rowType === "header"
            ? "header"
            : r.rowType === "total"
              ? "total"
              : r.rowType === "net"
                ? `net${statementNetLossClass(r)}`
                : "line";
      const leftLabel = escapeHtml(indentParticular(r.expenseParticular, r.expenseIndent));
      const rightLabel = escapeHtml(indentParticular(r.incomeParticular, r.incomeIndent));
      const leftBold = r.expenseBold ? " bold" : "";
      const rightBold = r.incomeBold ? " bold" : "";
      const leftAmount = formatExportAmount(r.expenseAmount, r.expenseIsReturn);
      const rightAmount = formatExportAmount(r.incomeAmount, r.incomeIsReturn);

      if (r.rowType === "title") {
        return `<tr class="${rowClass}">
        <td class="label bold" colspan="2">${leftLabel}</td>
        <td class="divider"></td>
        <td class="label" colspan="2"></td>
      </tr>`;
      }

      return `<tr class="${rowClass}">
        <td class="label${leftBold}">${leftLabel}</td>
        <td class="num${leftBold}">${leftAmount}</td>
        <td class="divider"></td>
        <td class="label${rightBold}">${rightLabel}</td>
        <td class="num${rightBold}">${rightAmount}</td>
      </tr>`;
    })
    .join("");
}

function statementNetLossClass(r: PandLHorizontalExportRow): string {
  if (r.rowType !== "net") return "";
  return r.expenseParticular.toLowerCase().includes("loss") ? " loss" : "";
}

function buildPandLBody(
  rows: PandLHorizontalExportRow[],
  statement: PandLStatement,
): string {
  const tableHtml = buildTAccountTableHtml({
    leftTitle: "Expenses (Debit)",
    leftAmountHeader: "Amount (₹)",
    rightTitle: "Income (Credit)",
    rightAmountHeader: "Amount (₹)",
    rowsHtml: buildTableRowsHtml(rows),
  });

  const netLabel = statement.netProfit >= 0 ? "Net Profit" : "Net Loss";
  const balanceText = statement.isBalanced
    ? `${netLabel}: ₹ ${formatMoneyNumber(Math.abs(statement.netProfit))} — P&amp;L Balanced — Total ₹ ${formatMoneyNumber(Math.max(statement.totalIncome, statement.totalExpenses))} on both sides`
    : `Difference ₹ ${formatMoneyNumber(Math.abs(statement.netProfit))}`;

  const balanceMsg = buildBalanceMessageHtml(
    balanceText,
    statement.isBalanced ? "balanced" : "unbalanced",
  );

  const footerNote = `<p class="report-footer-note">
    Total Expenses: ₹ ${formatMoneyNumber(statement.totalExpenses)} ·
    Total Income: ₹ ${formatMoneyNumber(statement.totalIncome)}
  </p>`;

  return tableHtml + balanceMsg + footerNote;
}

export async function exportPandLToExcel(
  rows: PandLHorizontalExportRow[],
  meta: PandLExportMeta,
  statement: PandLStatement,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildPandLBody(rows, statement),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Profit_and_Loss_${todayExportDateSuffix()}.xls`);
}

export function exportPandLToPdf(
  rows: PandLHorizontalExportRow[],
  meta: PandLExportMeta,
  statement: PandLStatement,
): void {
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildPandLBody(rows, statement),
    landscape: true,
  });
  openReportPrintWindow(html);
}
