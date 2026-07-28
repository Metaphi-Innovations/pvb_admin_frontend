import { formatMoneyOrDash, formatMoneyWithSide } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  openReportPrintWindow,
  formatExportAmount,
  type ReportColumnHeader,
  type ReportHeaderOptions,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import type { CashBookDisplayRow, CashBookSummary } from "./cash-book-data";

export interface CashBookExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher No." },
  { label: "Voucher Type" },
  { label: "Particular" },
  { label: "Narration" },
  { label: "Receipt (₹)", align: "right", className: "num" },
  { label: "Payment (₹)", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
];

function balanceLabel(row: CashBookDisplayRow): string {
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

function buildHeaderOptions(summary: CashBookSummary, meta: CashBookExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Cash Book",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Cash Ledger", value: `${summary.ledgerName} (${summary.ledgerCode})` },
      {
        label: "Opening Cash Balance",
        value: formatMoneyWithSide(summary.openingBalance, summary.openingBalanceType),
      },
    ],
  };
}

function buildCashBookBodyHtml(rows: CashBookDisplayRow[], summary: CashBookSummary): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr class="${r.kind === "opening" ? "summary-row" : ""}">
      <td>${escapeHtml(r.date)}</td>
      <td>${escapeHtml(r.kind === "opening" ? "—" : r.voucherNo)}</td>
      <td>${escapeHtml(r.voucherType)}</td>
      <td>${escapeHtml(r.particular)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatMoneyOrDash(r.receipt)}</td>
      <td class="num">${formatMoneyOrDash(r.payment)}</td>
      <td class="num">${escapeHtml(balanceLabel(r))}</td>
    </tr>`,
    )
    .join("");

  const tableHtml = buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml });

  const totalsNote = `<p class="report-footer-note">
    Total Receipts: ${formatExportAmount(summary.totalReceipts)} ·
    Total Payments: ${formatExportAmount(summary.totalPayments)} ·
    Closing Cash Balance: ${formatMoneyWithSide(summary.closingBalance, summary.closingBalanceType)}
  </p>`;

  return tableHtml + totalsNote;
}

export async function exportCashBookToExcel(
  rows: CashBookDisplayRow[],
  summary: CashBookSummary,
  meta: CashBookExportMeta,
): Promise<void> {
  const safeName = summary.ledgerCode.replace(/[^\w-]+/g, "_");
  const html = buildReportExcelDocumentHtml({
    title: `Cash Book — ${summary.ledgerName}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildCashBookBodyHtml(rows, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Cash_Book_${safeName}_${todayExportDateSuffix()}.xls`);
}

export function exportCashBookToPdf(
  rows: CashBookDisplayRow[],
  summary: CashBookSummary,
  meta: CashBookExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: `Cash Book — ${summary.ledgerName}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildCashBookBodyHtml(rows, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
