import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  formatExportAmount,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-presentation";
import type { TdsSummaryTotals, TdsSummaryTxnRow } from "./tds-summary-data";

const REPORT_NAME = "TDS Summary";

export interface TdsSummaryExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  month: string;
  tdsSection: string;
  party: string;
  search: string;
  branch?: string;
  voucherType?: string;
  deducteeType?: string;
}

function buildHeaderOptions(meta: TdsSummaryExportMeta): ReportHeaderOptions {
  const filters = [
    { label: "Month", value: meta.month },
    { label: "TDS Section", value: meta.tdsSection },
    { label: "Party", value: meta.party },
    { label: "Search", value: meta.search || "—" },
  ];
  if (meta.branch && meta.branch !== "All") {
    filters.push({ label: "Branch", value: meta.branch });
  }
  if (meta.voucherType && meta.voucherType !== "All") {
    filters.push({ label: "Voucher Type", value: meta.voucherType });
  }
  if (meta.deducteeType && meta.deducteeType !== "All") {
    filters.push({ label: "TDS Deductee Type", value: meta.deducteeType });
  }

  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters,
  };
}

/** Column order matches on-screen TDS Summary table. */
const COLUMNS: ReportColumnHeader[] = [
  { label: "Month" },
  { label: "Party Name" },
  { label: "PAN" },
  { label: "Invoice Date" },
  { label: "Invoice No." },
  { label: "Amount (₹)", align: "right", className: "num" },
  { label: "TDS Amount (₹)", align: "right", className: "num" },
  { label: "TDS Rate", align: "right", className: "num" },
  { label: "TDS Section" },
];

function buildTableRowsHtml(rows: TdsSummaryTxnRow[]): string {
  return rows
    .map(
      (r) => `<tr class="line">
      <td>${escapeHtml(r.month)}</td>
      <td>${escapeHtml(r.partyName)}</td>
      <td class="mono">${escapeHtml(r.pan)}</td>
      <td>${escapeHtml(r.invoiceDateDisplay)}</td>
      <td class="mono">${escapeHtml(r.invoiceNo)}</td>
      <td class="num">${formatExportAmount(r.amount)}</td>
      <td class="num">${formatExportAmount(r.tdsAmount)}</td>
      <td class="num">${escapeHtml(r.tdsRate)}</td>
      <td class="mono">${escapeHtml(r.tdsSection)}</td>
    </tr>`,
    )
    .join("");
}

function buildTotalsFooterHtml(totals: TdsSummaryTotals): string {
  return `<tr class="total">
    <td colspan="5"><strong>Totals (${totals.count} ${totals.count === 1 ? "entry" : "entries"})</strong></td>
    <td class="num"><strong>${formatExportAmount(totals.totalAmount)}</strong></td>
    <td class="num"><strong>${formatExportAmount(totals.totalTds)}</strong></td>
    <td></td>
    <td></td>
  </tr>`;
}

function buildFooterNote(totals: TdsSummaryTotals): string {
  return `<p class="report-footer-note">
    Total Amount: ₹ ${formatMoneyNumber(totals.totalAmount)} ·
    Total TDS: ₹ ${formatMoneyNumber(totals.totalTds)}
  </p>`;
}

function buildReportBodyHtml(rows: TdsSummaryTxnRow[], totals: TdsSummaryTotals): string {
  const tableHtml = buildStandardReportTableHtml({
    columns: COLUMNS,
    bodyHtml: buildTableRowsHtml(rows),
    footerHtml: buildTotalsFooterHtml(totals),
  });
  return tableHtml + buildFooterNote(totals);
}

export async function exportTdsSummaryToExcel(
  rows: TdsSummaryTxnRow[],
  meta: TdsSummaryExportMeta,
  totals: TdsSummaryTotals,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
  });
  downloadReportExcelHtml(html, `TDS_Summary_${todayExportDateSuffix()}.xls`);
}

export function exportTdsSummaryToPdf(
  rows: TdsSummaryTxnRow[],
  meta: TdsSummaryExportMeta,
  totals: TdsSummaryTotals,
): void {
  exportTabularReportToPdf({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    columns: COLUMNS,
    bodyHtml: buildTableRowsHtml(rows),
    footerHtml: buildTotalsFooterHtml(totals),
    footerNote: `Total Amount: ₹ ${formatMoneyNumber(totals.totalAmount)} · Total TDS: ₹ ${formatMoneyNumber(totals.totalTds)}`,
    landscape: true,
  });
}
