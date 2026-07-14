import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildTAccountReportBodyHtml,
  exportAccountsReportToExcel,
  exportAccountsReportToPdf,
  type HorizontalTAccountRow,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-engine";
import { buildBalanceMessageHtml } from "@/lib/accounts/report-export-presentation";
import type { PandLHorizontalExportRow, PandLStatement } from "./pl-data";
import { formatPlReportDate } from "./pl-display";

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

function resolveExportAmount(
  groupTotal: number | null,
  ledgerAmount: number | null,
  isReturn?: boolean,
): number | null {
  if (ledgerAmount != null) return ledgerAmount;
  return groupTotal;
}

function toHorizontalRows(rows: PandLHorizontalExportRow[]): HorizontalTAccountRow[] {
  return rows.map((r) => {
    const rowType =
      r.rowType === "total"
        ? "total"
        : r.rowType === "net"
          ? "net"
          : r.rowType === "section_total"
            ? "subtotal"
            : "line";

    return {
      rowType,
      left: {
        particular: r.expenseParticular,
        indent: 0,
        amount: resolveExportAmount(
          r.expenseGroupTotal,
          r.expenseLedgerAmount,
          r.expenseIsReturn,
        ),
        bold: r.expenseBold,
        isReturn: r.expenseIsReturn,
      },
      right: {
        particular: r.incomeParticular,
        indent: 0,
        amount: resolveExportAmount(
          r.incomeGroupTotal,
          r.incomeLedgerAmount,
          r.incomeIsReturn,
        ),
        bold: r.incomeBold,
        isReturn: r.incomeIsReturn,
      },
    };
  });
}

function buildHeaderOptions(meta: PandLExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear || "All years",
    dateFrom: formatPlReportDate(meta.dateFrom),
    dateTo: formatPlReportDate(meta.dateTo),
    filters: [
      { label: "Branch", value: meta.branch ?? "All branches" },
      { label: "Warehouse", value: meta.warehouse ?? "All warehouses" },
      { label: "Party", value: meta.party ?? "All parties" },
      { label: "View Type", value: meta.viewType ?? "Summary" },
    ],
  };
}

function buildPandLBody(
  rows: PandLHorizontalExportRow[],
  statement: PandLStatement,
): string {
  const tableHtml = buildTAccountReportBodyHtml({
    leftTitle: "Debit",
    leftAmountHeader: "Amount",
    rightTitle: "Credit",
    rightAmountHeader: "Amount",
    rows: toHorizontalRows(rows),
  });

  const netLabel = statement.netProfit >= 0 ? "Net Profit" : "Net Loss";
  const balanceText = statement.isBalanced
    ? `${netLabel}: ₹ ${formatMoneyNumber(Math.abs(statement.netProfit))} — P&amp;L Balanced — Total ₹ ${formatMoneyNumber(statement.finalDebitTotal)} on both sides`
    : `Difference ₹ ${formatMoneyNumber(Math.abs(statement.finalDebitTotal - statement.finalCreditTotal))}`;

  const balanceMsg = buildBalanceMessageHtml(
    balanceText,
    statement.isBalanced ? "balanced" : "unbalanced",
  );

  const footerNote = `<p class="report-footer-note">
  Gross Profit: ₹ ${formatMoneyNumber(Math.abs(statement.grossProfit))} ·
  Net Profit: ₹ ${formatMoneyNumber(statement.netProfit)}
</p>`;

  return tableHtml + balanceMsg + footerNote;
}

export async function exportPandLToExcel(
  rows: PandLHorizontalExportRow[],
  meta: PandLExportMeta,
  statement: PandLStatement,
): Promise<void> {
  exportAccountsReportToExcel({
    title: REPORT_NAME,
    filename: "Profit_and_Loss",
    header: buildHeaderOptions(meta),
    bodyHtml: buildPandLBody(rows, statement),
    landscape: true,
  });
}

export function exportPandLToPdf(
  rows: PandLHorizontalExportRow[],
  meta: PandLExportMeta,
  statement: PandLStatement,
): void {
  exportAccountsReportToPdf({
    title: REPORT_NAME,
    filename: "Profit_and_Loss",
    header: buildHeaderOptions(meta),
    bodyHtml: buildPandLBody(rows, statement),
    landscape: true,
  });
}
