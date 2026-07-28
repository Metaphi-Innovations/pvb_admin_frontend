import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildHorizontalTAccountBodyHtml,
  buildTAccountReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  type HorizontalTAccountRow,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import { buildBalanceMessageHtml } from "@/lib/accounts/report-export-presentation";
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

function toHorizontalRows(rows: BalanceSheetHorizontalExportRow[]): HorizontalTAccountRow[] {
  return rows.map((r) => ({
    rowType: r.rowType,
    left: {
      particular: r.liabilityParticular,
      indent: r.liabilityIndent,
      amount: r.liabilityAmount,
      bold: r.liabilityBold,
    },
    right: {
      particular: r.assetParticular,
      indent: r.assetIndent,
      amount: r.assetAmount,
      bold: r.assetBold,
    },
  }));
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
    ],
  };
}

function buildBalanceSheetBody(
  rows: BalanceSheetHorizontalExportRow[],
  meta: BalanceSheetExportMeta,
  statement: BalanceSheetStatement,
): { bodyHtml: string; footerHtml: string } {
  const tableHtml = buildTAccountReportBodyHtml({
    leftTitle: "Liabilities",
    leftAmountHeader: "Amount (₹)",
    rightTitle: "Assets",
    rightAmountHeader: "Amount (₹)",
    rows: toHorizontalRows(rows),
  });

  const balanceText = statement.isBalanced
    ? `Total Liabilities ₹ ${formatMoneyNumber(statement.totalLiabilities)} = Total Assets ₹ ${formatMoneyNumber(statement.totalAssets)}`
    : `Difference : ₹ ${formatMoneyNumber(Math.abs(statement.difference))} — Balance Sheet does not tally.`;
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
  exportAccountsReportToExcel({
    title: REPORT_NAME,
    filename: "Balance_Sheet",
    header: buildHeaderOptions(meta),
    bodyHtml,
    footerHtml,
    landscape: true,
  });
}

export function exportBalanceSheetToPdf(
  rows: BalanceSheetHorizontalExportRow[],
  meta: BalanceSheetExportMeta,
  statement: BalanceSheetStatement,
): void {
  const { bodyHtml, footerHtml } = buildBalanceSheetBody(rows, meta, statement);
  exportAccountsReportToPdf({
    title: REPORT_NAME,
    filename: "Balance_Sheet",
    header: buildHeaderOptions(meta),
    bodyHtml,
    footerHtml,
    landscape: true,
  });
}

/** @internal Re-export for tests or custom builders */
export { buildHorizontalTAccountBodyHtml };
