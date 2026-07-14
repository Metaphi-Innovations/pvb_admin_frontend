/**
 * Journal voucher listing export (Excel / print-PDF).
 * Absorbed from the removed Journal Register report so export capability is not lost.
 */

import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
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
import { primaryDebitCreditLedgers } from "@/lib/accounts/voucher-line-helpers";
import type { AccountingVoucher } from "../voucher-data";

export interface JournalVoucherExportMeta {
  dateFrom: string;
  dateTo: string;
  search: string;
  status: string;
}

export interface JournalExportRow {
  date: string;
  journalNo: string;
  referenceNo: string;
  debitLedger: string;
  creditLedger: string;
  narration: string;
  debitAmount: number;
  creditAmount: number;
  status: string;
  createdBy: string;
}

export interface JournalExportSummary {
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
  count: number;
}

function formatExportDate(iso: string): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function vouchersToJournalExportRows(vouchers: AccountingVoucher[]): JournalExportRow[] {
  return vouchers.map((v) => {
    const { debitLedger, creditLedger } = primaryDebitCreditLedgers(v.lines);
    return {
      date: v.date,
      journalNo: v.voucherNumber,
      referenceNo: v.referenceNo?.trim() || "—",
      debitLedger,
      creditLedger,
      narration: v.narration?.trim() || "—",
      debitAmount: roundMoney(v.totalDebit),
      creditAmount: roundMoney(v.totalCredit),
      status: v.status,
      createdBy: v.createdBy ?? "—",
    };
  });
}

export function computeJournalExportSummary(rows: JournalExportRow[]): JournalExportSummary {
  const totalDebit = roundMoney(rows.reduce((s, r) => s + r.debitAmount, 0));
  const totalCredit = roundMoney(rows.reduce((s, r) => s + r.creditAmount, 0));
  const difference = roundMoney(totalDebit - totalCredit);
  return {
    totalDebit,
    totalCredit,
    isBalanced: difference === 0,
    difference,
    count: rows.length,
  };
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
  { label: "Status" },
];

function buildHeaderOptions(meta: JournalVoucherExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "Journal Vouchers",
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Status", value: meta.status === "all" ? "All" : meta.status },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

function buildJournalBody(rows: JournalExportRow[], summary: JournalExportSummary): string {
  const bodyHtml = rows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(formatExportDate(r.date))}</td>
      <td class="mono">${escapeHtml(r.journalNo)}</td>
      <td class="mono">${escapeHtml(r.referenceNo === "—" ? "" : r.referenceNo)}</td>
      <td>${escapeHtml(r.debitLedger)}</td>
      <td>${escapeHtml(r.creditLedger)}</td>
      <td>${escapeHtml(r.narration)}</td>
      <td class="num">${formatExportAmount(r.debitAmount)}</td>
      <td class="num">${formatExportAmount(r.creditAmount)}</td>
      <td>${escapeHtml(r.status)}</td>
    </tr>`,
    )
    .join("");

  const footerHtml = `<tr class="total">
    <td colspan="6"><strong>Total</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalDebit)}</strong></td>
    <td class="num"><strong>${formatExportAmount(summary.totalCredit)}</strong></td>
    <td></td>
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

export async function exportJournalVouchersToExcel(
  rows: JournalExportRow[],
  meta: JournalVoucherExportMeta,
  summary: JournalExportSummary,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: "Journal Vouchers Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildJournalBody(rows, summary),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Journal_Vouchers_${todayExportDateSuffix()}.xls`);
}

export function exportJournalVouchersToPdf(
  rows: JournalExportRow[],
  meta: JournalVoucherExportMeta,
  summary: JournalExportSummary,
): void {
  const html = buildReportDocumentHtml({
    title: "Journal Vouchers Report",
    header: buildHeaderOptions(meta),
    bodyHtml: buildJournalBody(rows, summary),
    landscape: true,
  });
  openReportPrintWindow(html);
}
