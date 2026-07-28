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
import type { B2cInvoiceRow, B2cSummaryTotals } from "@/lib/accounts/gstr1-b2c-compute";

const REPORT_NAME = "GSTR-1 — B2C Invoices";

export interface B2cExportMeta {
  financialYear: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
  customer: string;
  gstRate: string;
  invoiceNo: string;
  status: string;
}

function buildHeaderOptions(meta: B2cExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "Customer", value: meta.customer },
      { label: "GST Rate", value: meta.gstRate },
      { label: "Invoice Number", value: meta.invoiceNo || "—" },
      { label: "Status", value: meta.status },
    ],
  };
}

function buildSummaryStripHtml(totals: B2cSummaryTotals): string {
  const items = [
    { label: "Invoices", value: String(totals.totalInvoices) },
    { label: "Invoice Value", value: `₹ ${formatMoneyNumber(totals.totalInvoiceValue)}` },
    { label: "Taxable", value: `₹ ${formatMoneyNumber(totals.totalTaxableValue)}` },
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

const MAIN_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Invoice No." },
  { label: "Customer" },
  { label: "Type" },
  { label: "POS" },
  { label: "Invoice Value (₹)", align: "right", className: "num" },
  { label: "Taxable (₹)", align: "right", className: "num" },
  { label: "Rate" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "Tax (₹)", align: "right", className: "num" },
  { label: "Status" },
];

const BREAKUP_COLUMNS: ReportColumnHeader[] = [
  { label: "Invoice No." },
  { label: "Rate", align: "right", className: "num" },
  { label: "Taxable (₹)", align: "right", className: "num" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "Tax (₹)", align: "right", className: "num" },
];

function buildMainTableRowsHtml(rows: B2cInvoiceRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.invoiceDate)}</td>
        <td class="mono">${escapeHtml(r.invoiceNo)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td>${escapeHtml(r.customerType)}</td>
        <td>${escapeHtml(r.placeOfSupply)}</td>
        <td class="num">${formatExportAmount(r.invoiceValue)}</td>
        <td class="num">${formatExportAmount(r.taxableValue)}</td>
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

function buildBreakupTableRowsHtml(rows: B2cInvoiceRow[]): string {
  return rows
    .flatMap((r) =>
      r.rateBreakups.map(
        (b) => `<tr>
          <td class="mono">${escapeHtml(r.invoiceNo)}</td>
          <td class="num">${b.ratePct}%</td>
          <td class="num">${formatExportAmount(b.taxableValue)}</td>
          <td class="num">${formatExportAmount(b.cgst)}</td>
          <td class="num">${formatExportAmount(b.sgst)}</td>
          <td class="num">${formatExportAmount(b.igst)}</td>
          <td class="num">${formatExportAmount(b.totalTax)}</td>
        </tr>`,
      ),
    )
    .join("");
}

function buildReportBodyHtml(rows: B2cInvoiceRow[], totals: B2cSummaryTotals): string {
  const mainTable = buildStandardReportTableHtml({
    columns: MAIN_COLUMNS,
    bodyHtml: buildMainTableRowsHtml(rows),
  });
  const breakupTable = buildStandardReportTableHtml({
    columns: BREAKUP_COLUMNS,
    bodyHtml: buildBreakupTableRowsHtml(rows),
  });
  return `${buildSummaryStripHtml(totals)}${mainTable}<p class="report-subtitle">Tax Rate Breakup</p>${breakupTable}`;
}

export async function exportB2cInvoicesToExcel(
  rows: B2cInvoiceRow[],
  totals: B2cSummaryTotals,
  meta: B2cExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
    compact: true,
  });
  downloadReportExcelHtml(html, `GSTR1_B2C_Invoices_${todayExportDateSuffix()}.xls`);
}

export function exportB2cInvoicesToPdf(
  rows: B2cInvoiceRow[],
  totals: B2cSummaryTotals,
  meta: B2cExportMeta,
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
