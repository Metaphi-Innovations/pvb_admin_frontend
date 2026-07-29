import { formatMoney } from "@/lib/accounts/money-format";

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

import type { StockLedgerRow, StockLedgerSummary } from "./stock-ledger-data";

import {

  formatQty,

  formatStockLedgerDate,

  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,

} from "./stock-ledger-data";



const REPORT_NAME = "Stock Ledger";



export interface StockLedgerExportMeta {

  dateFrom: string;

  dateTo: string;

  financialYear: string;

  warehouse: string;

  product: string;

  batchNo: string;

  transactionType: string;

  documentNo: string;

  search: string;

}



function buildHeaderOptions(meta: StockLedgerExportMeta): ReportHeaderOptions {

  return {

    reportTitle: REPORT_NAME,

    financialYear: meta.financialYear,

    dateFrom: meta.dateFrom,

    dateTo: meta.dateTo,

    filters: [

      { label: "Product", value: meta.product },

      { label: "Warehouse", value: meta.warehouse },

      { label: "Batch No.", value: meta.batchNo },

      { label: "Transaction Type", value: meta.transactionType },

      { label: "Document No.", value: meta.documentNo },

      { label: "Search", value: meta.search || "—" },

    ],

  };

}



const COLUMNS: ReportColumnHeader[] = [

  { label: "Date" },

  { label: "Document No." },

  { label: "Type" },

  { label: "Code" },

  { label: "Product" },

  { label: "Warehouse" },

  { label: "Batch" },

  { label: "Opening", align: "right", className: "num" },

  { label: "In", align: "right", className: "num" },

  { label: "Out", align: "right", className: "num" },

  { label: "Closing", align: "right", className: "num" },

  { label: "Unit" },

  { label: "Rate (₹)", align: "right", className: "num" },

  { label: "Value (₹)", align: "right", className: "num" },

];



function buildTableRowsHtml(rows: StockLedgerRow[]): string {

  return rows

    .map(

      (row) => `<tr>

        <td>${escapeHtml(formatStockLedgerDate(row.date))}</td>

        <td class="mono">${escapeHtml(row.documentNo)}</td>

        <td>${escapeHtml(STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType])}</td>

        <td class="mono">${escapeHtml(row.productCode)}</td>

        <td>${escapeHtml(row.productName)}</td>

        <td>${escapeHtml(row.warehouse)}</td>

        <td class="mono">${escapeHtml(row.batchNo)}</td>

        <td class="num">${formatQty(row.openingQty, true)}</td>

        <td class="num">${formatQty(row.inQty)}</td>

        <td class="num">${formatQty(row.outQty)}</td>

        <td class="num">${formatQty(row.closingQty, true)}</td>

        <td>${escapeHtml(row.unit)}</td>

        <td class="num">${row.rate ? formatExportAmount(row.rate) : "—"}</td>

        <td class="num">${row.value ? formatExportAmount(row.value) : "—"}</td>

      </tr>`,

    )

    .join("");

}



function buildTotalsFooterHtml(summary: StockLedgerSummary): string {

  return `<tr class="total">

    <td colspan="7"><strong>Totals</strong></td>

    <td class="num"><strong>${formatQty(summary.totalInwardQty, true)}</strong></td>

    <td class="num"><strong>${formatQty(summary.totalOutwardQty, true)}</strong></td>

    <td class="num"><strong>${formatQty(summary.closingStock, true)}</strong></td>

    <td colspan="3"></td>

  </tr>`;

}



function buildFooterNote(summary: StockLedgerSummary): string {

  return `<p class="report-footer-note">

    Total Products: ${summary.totalProducts} ·

    Inward: ${formatQty(summary.totalInwardQty, true)} ·

    Outward: ${formatQty(summary.totalOutwardQty, true)} ·

    Closing: ${formatQty(summary.closingStock, true)} ·

    Value: ${formatMoney(summary.stockValue)}

  </p>`;

}



function buildReportBodyHtml(rows: StockLedgerRow[], summary: StockLedgerSummary): string {

  const tableHtml = buildStandardReportTableHtml({

    columns: COLUMNS,

    bodyHtml: buildTableRowsHtml(rows),

    footerHtml: buildTotalsFooterHtml(summary),

  });

  return tableHtml + buildFooterNote(summary);

}



export async function exportStockLedgerToExcel(

  rows: StockLedgerRow[],

  summary: StockLedgerSummary,

  meta: StockLedgerExportMeta,

): Promise<void> {

  const html = buildReportExcelDocumentHtml({

    title: REPORT_NAME,

    header: buildHeaderOptions(meta),

    bodyHtml: buildReportBodyHtml(rows, summary),

    landscape: true,

    compact: true,

  });

  downloadReportExcelHtml(html, `Stock_Ledger_${todayExportDateSuffix()}.xls`);

}



function csvEscape(value: unknown): string {

  const str = String(value ?? "");

  if (str.includes(",") || str.includes('"') || str.includes("\n")) {

    return `"${str.replace(/"/g, '""')}"`;

  }

  return str;

}



function exportDataRows(rows: StockLedgerRow[]) {

  return rows.map((row) => ({

    Date: formatStockLedgerDate(row.date),

    "Document No.": row.documentNo,

    "Transaction Type": STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType],

    "Product Code": row.productCode,

    "Product Name": row.productName,

    Warehouse: row.warehouse,

    "Batch No.": row.batchNo,

    "Mfg Date": row.mfgDate ? formatStockLedgerDate(row.mfgDate) : "",

    "Expiry Date": row.expiryDate ? formatStockLedgerDate(row.expiryDate) : "",

    "Opening Qty": row.openingQty || "",

    "In Qty": row.inQty || "",

    "Out Qty": row.outQty || "",

    "Closing Qty": row.closingQty,

    Unit: row.unit,

    Rate: row.rate || "",

    Value: row.value || "",

    "Reference Module": row.referenceModule,

    "Created By": row.createdBy,

    Remarks: row.remarks,

  }));

}



export function exportStockLedgerToCsv(

  rows: StockLedgerRow[],

  _summary: StockLedgerSummary,

  _meta: StockLedgerExportMeta,

): void {

  const data = exportDataRows(rows);

  const headers = Object.keys(data[0] ?? {});

  const lines = [

    headers.join(","),

    ...data.map((row) => headers.map((h) => csvEscape(row[h as keyof typeof row])).join(",")),

  ];



  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = `Stock_Ledger_${todayExportDateSuffix()}.csv`;

  a.click();

  URL.revokeObjectURL(url);

}



export function exportStockLedgerToPdf(

  rows: StockLedgerRow[],

  summary: StockLedgerSummary,

  meta: StockLedgerExportMeta,

): void {

  const html = buildReportDocumentHtml({

    title: REPORT_NAME,

    header: buildHeaderOptions(meta),

    bodyHtml: buildReportBodyHtml(rows, summary),

    landscape: true,

    compact: true,

  });

  openReportPrintWindow(html);

}


