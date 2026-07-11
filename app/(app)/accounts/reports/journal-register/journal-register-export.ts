import type { JournalRegisterRow, JournalRegisterSummary } from "./journal-register-data";
import { formatJournalRegisterDate } from "./journal-register-data";
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

export interface JournalRegisterExportMeta {
  dateFrom: string;
  dateTo: string;
  ledger: string;
  search: string;
}

const COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Journal No." },
  { label: "Reference No." },
  { label: "Debit Ledger" },
  { label: "Credit Ledger" },
  { label: "Narration" },
  { label: "Debit Amount (₹)", align: "right", className: "num" },
  { label: "Credit Amount (₹)", align: "right", className: "num" },
];

function buildHeaderOptions(meta: JournalRegisterExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Journal Register",
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Ledger Filter", value: meta.ledger || "All" },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function buildJournalRegisterBody(
  rows: JournalRegisterRow[],
  summary: JournalRegisterSummary,
): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(formatJournalRegisterDate(r.date))}</td>
      <td class="mono">${escapeHtml(r.journalNo)}</td>
      <td class="mono">${escapeHtml(r.referenceNo === "—" ? "" : r.referenceNo)}</td>
      <td>${escapeHtml(r.debitLedger)}</td>
      <td>${escapeHtml(r.creditLedger)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatExportAmount(r.debitAmount)}</td>
      <td class="num">${formatExportAmount(r.creditAmount)}</td>
    </tr>`,
    )
    .join("");

  const footerHtml = `<tr class="total">
    <td colspan="6"><strong>Total</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalDebit)}</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalCredit)}</strong></td>
  </tr>`;

  const balanceNote = summary.isBalanced
    ? buildBalanceMessageHtml("Totals are balanced.", "balanced")
    : buildBalanceMessageHtml(
        `Warning: Total Debit and Total Credit do not match (difference: ${formatMoney(summary.difference)}).`,
        "unbalanced",
      );

  const summaryStrip = `<div class="summary-strip">
    <div class="summary-strip-item"><label>Entries</label><strong>${summary.count}</strong></div>
    <div class="summary-strip-item"><label>Total Debit</label><strong>${formatExportAmount(summary.totalDebit)}</strong></div>
    <div class="summary-strip-item"><label>Total Credit</label><strong>${formatExportAmount(summary.totalCredit)}</strong></div>
  </div>`;

  const tableHtml = buildStandardReportTableHtml({ columns: COLUMNS, bodyHtml, footerHtml });
  return summaryStrip + tableHtml + balanceNote;
}

export async function exportJournalRegisterToExcel(
  rows: JournalRegisterRow[],
  meta: JournalRegisterExportMeta,
  summary: JournalRegisterSummary,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: "Journal Register Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildJournalRegisterBody(rows, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Journal_Register_${todayExportDateSuffix()}.xls`);
}

export function exportJournalRegisterToPdf(
  rows: JournalRegisterRow[],
  meta: JournalRegisterExportMeta,
  summary: JournalRegisterSummary,
): void {
  const html = buildReportDocumentHtml({
    title: "Journal Register Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildJournalRegisterBody(rows, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
