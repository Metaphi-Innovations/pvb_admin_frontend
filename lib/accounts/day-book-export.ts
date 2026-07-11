import type { DayBookEntry } from "@/lib/accounts/day-book-data";
import { formatDayBookDate } from "@/lib/accounts/day-book-data";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  buildBalanceMessageHtml,
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

export interface DayBookExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  voucherType: string;
  search: string;
}

export interface DayBookExportSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  lineCount?: number;
  voucherCount?: number;
  unbalancedVoucherCount?: number;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher No." },
  { label: "Voucher Type" },
  { label: "Ledger / Party" },
  { label: "Narration" },
  { label: "Debit (₹)", align: "right", className: "num" },
  { label: "Credit (₹)", align: "right", className: "num" },
];

function buildHeaderOptions(meta: DayBookExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Day Book",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Voucher Type", value: meta.voucherType },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function buildDayBookExportBody(
  entries: DayBookEntry[],
  summary: DayBookExportSummary,
): string {
  const bodyHtml = entries
    .map(
      (e) => `
    <tr${e.isUnbalancedVoucher ? ' class="unbalanced"' : ""}>
      <td>${escapeHtml(formatDayBookDate(e.date))}</td>
      <td class="mono">${escapeHtml(e.voucherNo)}</td>
      <td>${escapeHtml(e.voucherTypeLabel)}</td>
      <td>${escapeHtml(e.partyLedger)}</td>
      <td>${escapeHtml(e.narration)}</td>
      <td class="num">${e.debit ? formatExportAmount(e.debit) : "—"}</td>
      <td class="num">${e.credit ? formatExportAmount(e.credit) : "—"}</td>
    </tr>`,
    )
    .join("");

  const footerHtml = `<tr class="total">
    <td colspan="5"><strong>Totals</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalDebit)}</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalCredit)}</strong></td>
  </tr>`;

  const balanceNote = summary.isBalanced
    ? buildBalanceMessageHtml("Totals are balanced across all ledger lines.", "balanced")
    : buildBalanceMessageHtml(
        `Warning: Total Debit and Total Credit do not match (difference: ${formatMoney(summary.totalDebit - summary.totalCredit)}).${
          summary.unbalancedVoucherCount
            ? ` ${summary.unbalancedVoucherCount} voucher(s) are unbalanced.`
            : ""
        }`,
        "unbalanced",
      );

  const summaryStrip = `<div class="summary-strip">
    <div class="summary-strip-item"><label>Ledger Lines</label><strong>${summary.lineCount ?? entries.length}</strong></div>
    <div class="summary-strip-item"><label>Total Debit</label><strong>${formatExportAmount(summary.totalDebit)}</strong></div>
    <div class="summary-strip-item"><label>Total Credit</label><strong>${formatExportAmount(summary.totalCredit)}</strong></div>
  </div>`;

  const tableHtml = buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml, footerHtml });
  return summaryStrip + balanceNote + tableHtml;
}

export async function exportDayBookToExcel(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: DayBookExportSummary,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: "Day Book Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildDayBookExportBody(entries, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Day_Book_${todayExportDateSuffix()}.xls`);
}

export function exportDayBookToPdf(
  entries: DayBookEntry[],
  meta: DayBookExportMeta,
  summary: DayBookExportSummary,
): void {
  const html = buildReportDocumentHtml({
    title: "Day Book Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildDayBookExportBody(entries, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
