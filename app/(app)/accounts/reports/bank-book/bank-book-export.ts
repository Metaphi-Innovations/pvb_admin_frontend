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
import type { BankBookDisplayRow, BankBookSummary } from "./bank-book-data";
import { formatBankBookDate } from "./bank-book-data";

export interface BankBookExportMeta {
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

function balanceLabel(row: BankBookDisplayRow): string {
  return formatMoneyWithSide(row.runningBalance, row.runningBalanceType);
}

function buildHeaderOptions(summary: BankBookSummary, meta: BankBookExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Bank Book",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    subtitle: `${summary.bankName} — ${summary.accountNickname}`,
    filters: [
      { label: "Account", value: summary.maskedAccountNumber },
      {
        label: "Opening Balance",
        value: formatMoneyWithSide(summary.openingBalance, summary.openingBalanceType),
      },
    ],
  };
}

function buildBankBookBodyHtml(
  openingRow: BankBookDisplayRow,
  transactionRows: BankBookDisplayRow[],
  summary: BankBookSummary,
): string {
  const rows = [openingRow, ...transactionRows];
  const bodyHtml = rows
    .map(
      (r) => `
    <tr class="${r.kind === "opening" ? "summary-row" : ""}">
      <td>${escapeHtml(formatBankBookDate(r.date))}</td>
      <td>${escapeHtml(r.voucherNo)}</td>
      <td>${escapeHtml(r.voucherType)}</td>
      <td>${escapeHtml(r.particular)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatMoneyOrDash(r.receipt)}</td>
      <td class="num">${formatMoneyOrDash(r.payment)}</td>
      <td class="num">${escapeHtml(balanceLabel(r))}</td>
    </tr>`,
    )
    .join("");

  const footerHtml = `<tr class="total">
    <td colspan="5"><strong>Total</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalReceipts)}</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalPayments)}</strong></td>
    <td class="num"><strong>${escapeHtml(formatMoneyWithSide(summary.closingBalance, summary.closingBalanceType))}</strong></td>
  </tr>`;

  return buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml, footerHtml });
}

export async function exportBankBookToExcel(
  openingRow: BankBookDisplayRow,
  transactionRows: BankBookDisplayRow[],
  summary: BankBookSummary,
  meta: BankBookExportMeta,
): Promise<void> {
  const safeName = summary.accountNickname.replace(/[^\w-]+/g, "_");
  const html = buildReportExcelDocumentHtml({
    title: `Bank Book — ${summary.accountNickname}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildBankBookBodyHtml(openingRow, transactionRows, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Bank_Book_${safeName}_${todayExportDateSuffix()}.xls`);
}

export function exportBankBookToPdf(
  openingRow: BankBookDisplayRow,
  transactionRows: BankBookDisplayRow[],
  summary: BankBookSummary,
  meta: BankBookExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: `Bank Book — ${summary.accountNickname}`,
    header: buildHeaderOptions(summary, meta),
    bodyHtml: buildBankBookBodyHtml(openingRow, transactionRows, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
