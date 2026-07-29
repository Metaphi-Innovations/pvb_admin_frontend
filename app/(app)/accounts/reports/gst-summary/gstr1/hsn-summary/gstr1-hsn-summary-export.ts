import { formatMoneyNumber } from "@/lib/accounts/money-format";
import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  formatExportAmount,
  openReportPrintWindow,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-presentation";
import type {
  HsnSummaryRow,
  HsnSummaryTotals,
} from "@/lib/accounts/gstr1-hsn-summary-compute";

const REPORT_NAME = "GSTR-1 — HSN-wise Summary";

export interface HsnSummaryExportMeta {
  financialYear: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
  hsnCode: string;
  gstRate: string;
  status: string;
}

function buildHeaderOptions(meta: HsnSummaryExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "HSN / SAC", value: meta.hsnCode || "All" },
      { label: "GST Rate", value: meta.gstRate },
      { label: "Status", value: meta.status },
    ],
  };
}

function buildSummaryStripHtml(totals: HsnSummaryTotals): string {
  const items = [
    { label: "HSN Codes", value: String(totals.totalHsnCodes) },
    { label: "Qty", value: String(totals.totalQuantity) },
    { label: "Gross", value: `₹ ${formatMoneyNumber(totals.totalGrossValue)}` },
    { label: "Returns", value: `₹ ${formatMoneyNumber(totals.totalSalesReturnValue)}` },
    { label: "Net Taxable", value: `₹ ${formatMoneyNumber(totals.totalNetTaxableValue)}` },
    { label: "CGST", value: `₹ ${formatMoneyNumber(totals.totalCgst)}` },
    { label: "SGST", value: `₹ ${formatMoneyNumber(totals.totalSgst)}` },
    { label: "IGST", value: `₹ ${formatMoneyNumber(totals.totalIgst)}` },
    { label: "Exceptions", value: String(totals.totalExceptions) },
  ];
  return `<div class="summary-strip">${items
    .map(
      (item) =>
        `<div class="summary-strip-item"><label>${escapeHtml(item.label)}</label><strong>${escapeHtml(item.value)}</strong></div>`,
    )
    .join("")}</div>`;
}

const SUMMARY_COLUMNS: ReportColumnHeader[] = [
  { label: "HSN" },
  { label: "Description" },
  { label: "UQC" },
  { label: "Qty", align: "right", className: "num" },
  { label: "Gross (₹)", align: "right", className: "num" },
  { label: "Returns (₹)", align: "right", className: "num" },
  { label: "Net Taxable (₹)", align: "right", className: "num" },
  { label: "Rate" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "Tax (₹)", align: "right", className: "num" },
  { label: "Status" },
];

function buildSummaryTableRowsHtml(rows: HsnSummaryRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td class="mono">${escapeHtml(r.hsnCode)}</td>
        <td>${escapeHtml(r.description)}</td>
        <td>${escapeHtml(r.uqc)}</td>
        <td class="num">${r.totalQuantity}</td>
        <td class="num">${formatExportAmount(r.grossValue)}</td>
        <td class="num">${formatExportAmount(r.salesReturnValue)}</td>
        <td class="num">${formatExportAmount(r.netTaxableValue)}</td>
        <td>${escapeHtml(r.gstRateLabel)}</td>
        <td class="num">${formatExportAmount(r.cgst)}</td>
        <td class="num">${formatExportAmount(r.sgst)}</td>
        <td class="num">${formatExportAmount(r.igst)}</td>
        <td class="num">${formatExportAmount(r.totalTax)}</td>
        <td>${r.status === "exception" ? "Exception" : "Valid"}</td>
      </tr>`,
    )
    .join("");
}

function buildReportBodyHtml(rows: HsnSummaryRow[], totals: HsnSummaryTotals): string {
  const summaryTable = buildStandardReportTableHtml({
    columns: SUMMARY_COLUMNS,
    bodyHtml: buildSummaryTableRowsHtml(rows),
  });
  return `${buildSummaryStripHtml(totals)}${summaryTable}`;
}

export async function exportHsnSummaryToExcel(
  rows: HsnSummaryRow[],
  totals: HsnSummaryTotals,
  meta: HsnSummaryExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
    compact: true,
  });
  downloadReportExcelHtml(html, `GSTR1_HSN_Summary_${todayExportDateSuffix()}.xls`);
}

export function exportHsnSummaryToPdf(
  rows: HsnSummaryRow[],
  totals: HsnSummaryTotals,
  meta: HsnSummaryExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
    compact: true,
  });
  openReportPrintWindow(html);
}
