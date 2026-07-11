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
import type {
  BalanceSheetHorizontalExportRow,
  BalanceSheetStatement,
} from "./balance-sheet-data";

const REPORT_NAME = "Balance Sheet";

export interface BalanceSheetExportMeta {
  asOnDate: string;
  financialYear: string;
  branch?: string;
  warehouse?: string;
  party?: string;
  viewType?: string;
}

function formatExportAmount(amount: number | null): string {
  if (amount == null) return "";
  if (amount < 0) return `(${formatMoney(Math.abs(amount))})`;
  return formatMoney(amount);
}

function buildHorizontalTableRowsHtml(rows: BalanceSheetHorizontalExportRow[]): string {
  return rows
    .map((r) => {
      const leftLabel = escapeHtml(indentParticular(r.liabilityParticular, r.liabilityIndent));
      const rightLabel = escapeHtml(indentParticular(r.assetParticular, r.assetIndent));
      const leftBold = r.liabilityBold ? " bold" : "";
      const rightBold = r.assetBold ? " bold" : "";
      const leftAmount = formatExportAmount(r.liabilityAmount);
      const rightAmount = formatExportAmount(r.assetAmount);
      const rowClass = r.rowType;

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

function buildHeaderOptions(meta: BalanceSheetExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear || "All years",
    reportPeriod: `As on ${meta.asOnDate}`,
    filters: [
      { label: "Branch", value: meta.branch ?? "All branches" },
      { label: "Warehouse", value: meta.warehouse ?? "All warehouses" },
      { label: "Party", value: meta.party ?? "All parties" },
      { label: "View Type", value: meta.viewType ?? "Summary" },
    ],
  };
}

function buildBalanceSheetBody(
  rows: BalanceSheetHorizontalExportRow[],
  meta: BalanceSheetExportMeta,
  statement: BalanceSheetStatement,
): { bodyHtml: string; footerHtml: string } {
  const tableRows = buildHorizontalTableRowsHtml(rows);
  const tableHtml = buildTAccountTableHtml({
    leftTitle: "Liabilities & Equity",
    leftAmountHeader: "Amount (₹)",
    rightTitle: "Assets",
    rightAmountHeader: "Amount (₹)",
    rowsHtml: tableRows,
  });

  const balanceText = statement.isBalanced
    ? `Balance Sheet Balanced — Total ₹ ${formatMoneyNumber(statement.totalAssets)} on both sides`
    : `Difference ₹ ${formatMoneyNumber(Math.abs(statement.difference))}`;
  const unpostedNote =
    statement.unpostedVoucherCount > 0
      ? ` · ${statement.unpostedVoucherCount} unposted voucher(s) as on ${meta.asOnDate}`
      : "";

  const balanceMsg = buildBalanceMessageHtml(
    balanceText + unpostedNote,
    statement.isBalanced ? "balanced" : "unbalanced",
  );
  const footerNote = `<p class="report-footer-note">
    Total Liabilities &amp; Equity: ₹ ${formatMoneyNumber(statement.totalLiabilities)} ·
    Total Assets: ₹ ${formatMoneyNumber(statement.totalAssets)}
  </p>`;

  return { bodyHtml: tableHtml + balanceMsg, footerHtml: footerNote };
}

export async function exportBalanceSheetToExcel(
  rows: BalanceSheetHorizontalExportRow[],
  meta: BalanceSheetExportMeta,
  statement: BalanceSheetStatement,
): Promise<void> {
  const { bodyHtml, footerHtml } = buildBalanceSheetBody(rows, meta, statement);
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml,
    footerHtml,
    landscape: true,
  });
  downloadReportExcelHtml(html, `Balance_Sheet_${todayExportDateSuffix()}.xls`);
}

export function exportBalanceSheetToPdf(
  rows: BalanceSheetHorizontalExportRow[],
  meta: BalanceSheetExportMeta,
  statement: BalanceSheetStatement,
): void {
  const { bodyHtml, footerHtml } = buildBalanceSheetBody(rows, meta, statement);
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml,
    footerHtml,
    landscape: true,
  });
  openReportPrintWindow(html);
}
