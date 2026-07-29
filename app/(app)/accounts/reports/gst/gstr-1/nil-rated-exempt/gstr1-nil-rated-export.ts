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
  NilRatedExemptRow,
  NilRatedExemptSummaryTotals,
} from "@/lib/accounts/gstr1-nil-rated-compute";

const REPORT_NAME = "GSTR-1 — Nil Rated / Exempt Supplies";

export interface NilRatedExportMeta {
  financialYear: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
  customer: string;
  supplyType: string;
  invoiceNo: string;
  status: string;
}

function buildHeaderOptions(meta: NilRatedExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "Customer", value: meta.customer },
      { label: "Supply Type", value: meta.supplyType },
      { label: "Invoice / Search", value: meta.invoiceNo || "—" },
      { label: "Status", value: meta.status },
    ],
  };
}

function buildSummaryStripHtml(totals: NilRatedExemptSummaryTotals): string {
  const items = [
    { label: "Nil Rated", value: `₹ ${formatMoneyNumber(totals.totalNilRatedValue)}` },
    { label: "Exempt", value: `₹ ${formatMoneyNumber(totals.totalExemptValue)}` },
    { label: "Non-GST", value: `₹ ${formatMoneyNumber(totals.totalNonGstValue)}` },
    { label: "Documents", value: String(totals.totalDocuments) },
    { label: "Exceptions", value: String(totals.totalExceptions) },
  ];
  return `<div class="summary-strip">${items
    .map(
      (item) =>
        `<div class="summary-strip-item"><label>${escapeHtml(item.label)}</label><strong>${escapeHtml(item.value)}</strong></div>`,
    )
    .join("")}</div>`;
}

const MAIN_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Invoice No." },
  { label: "Customer" },
  { label: "GSTIN" },
  { label: "POS" },
  { label: "Supply Type" },
  { label: "Product" },
  { label: "HSN" },
  { label: "Qty", align: "right", className: "num" },
  { label: "Supply Value (₹)", align: "right", className: "num" },
  { label: "Rate" },
  { label: "Status" },
];

function buildMainTableRowsHtml(rows: NilRatedExemptRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.invoiceDate)}</td>
        <td class="mono">${escapeHtml(r.invoiceNo)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td class="mono">${escapeHtml(r.gstin)}</td>
        <td>${escapeHtml(r.placeOfSupply)}</td>
        <td>${escapeHtml(r.supplyTypeLabel)}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td class="mono">${escapeHtml(r.hsn)}</td>
        <td class="num">${r.qty}</td>
        <td class="num">${formatExportAmount(r.supplyValue)}</td>
        <td>${escapeHtml(r.gstRateLabel)}</td>
        <td>${r.status === "exception" ? "Exception" : "Valid"}</td>
      </tr>`,
    )
    .join("");
}

function buildReportBodyHtml(rows: NilRatedExemptRow[], totals: NilRatedExemptSummaryTotals): string {
  const mainTable = buildStandardReportTableHtml({
    columns: MAIN_COLUMNS,
    bodyHtml: buildMainTableRowsHtml(rows),
  });
  return `${buildSummaryStripHtml(totals)}${mainTable}`;
}

export async function exportNilRatedExemptToExcel(
  rows: NilRatedExemptRow[],
  totals: NilRatedExemptSummaryTotals,
  meta: NilRatedExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
    compact: true,
  });
  downloadReportExcelHtml(html, `GSTR1_Nil_Rated_Exempt_${todayExportDateSuffix()}.xls`);
}

export function exportNilRatedExemptToPdf(
  rows: NilRatedExemptRow[],
  totals: NilRatedExemptSummaryTotals,
  meta: NilRatedExportMeta,
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
