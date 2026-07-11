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

import type { StockValuationRow, StockValuationTotals } from "./stock-valuation-data";



const REPORT_NAME = "Stock Valuation";



export interface StockValuationExportMeta {

  asOnDate: string;

  financialYear: string;

  valuationBasis: string;

  warehouse: string;

  category: string;

  product: string;

  stockStatus: string;

  search: string;

}



function buildHeaderOptions(meta: StockValuationExportMeta): ReportHeaderOptions {

  return {

    reportTitle: REPORT_NAME,

    financialYear: meta.financialYear,

    reportPeriod: `As on ${meta.asOnDate}`,

    subtitle: `Valuation Basis: ${meta.valuationBasis}`,

    filters: [

      { label: "Warehouse", value: meta.warehouse },

      { label: "Category", value: meta.category },

      { label: "Product", value: meta.product },

      { label: "Stock Status", value: meta.stockStatus },

      { label: "Search", value: meta.search || "—" },

    ],

  };

}



const COLUMNS: ReportColumnHeader[] = [

  { label: "Product Code" },

  { label: "Product Name" },

  { label: "Warehouse" },

  { label: "Closing Quantity", align: "right", className: "num" },

  { label: "Valuation Rate (₹)", align: "right", className: "num" },

  { label: "Total Stock Value (₹)", align: "right", className: "num" },

  { label: "Status" },

];



function buildTableRowsHtml(rows: StockValuationRow[]): string {

  return rows

    .map(

      (row) => `<tr>

        <td class="mono">${escapeHtml(row.productCode)}</td>

        <td>${escapeHtml(row.productName)}</td>

        <td>${escapeHtml(row.warehouse)}</td>

        <td class="num">${row.closingQty.toLocaleString("en-IN")}</td>

        <td class="num">${row.rateMissing ? "—" : formatExportAmount(row.valuationRate)}</td>

        <td class="num">${formatExportAmount(row.totalStockValue)}</td>

        <td>${escapeHtml(row.stockStatus)}</td>

      </tr>`,

    )

    .join("");

}



function buildTotalsFooterHtml(totals: StockValuationTotals): string {

  return `<tr class="total">

    <td colspan="3"><strong>Totals</strong></td>

    <td class="num"><strong>${totals.totalClosingQty.toLocaleString("en-IN")}</strong></td>

    <td></td>

    <td class="num"><strong>${formatExportAmount(totals.totalStockValue)}</strong></td>

    <td></td>

  </tr>`;

}



function buildFooterNote(meta: StockValuationExportMeta, totals: StockValuationTotals): string {

  return `<p class="report-footer-note">

    Valuation Basis: ${escapeHtml(meta.valuationBasis)} ·

    Total Closing Quantity: ${totals.totalClosingQty.toLocaleString("en-IN")} ·

    Total Stock Value: ₹ ${formatMoneyNumber(totals.totalStockValue)} ·

    ${totals.count} product line(s)

  </p>`;

}



function buildReportBodyHtml(

  rows: StockValuationRow[],

  meta: StockValuationExportMeta,

  totals: StockValuationTotals,

): string {

  const tableHtml = buildStandardReportTableHtml({

    columns: COLUMNS,

    bodyHtml: buildTableRowsHtml(rows),

    footerHtml: buildTotalsFooterHtml(totals),

  });

  return tableHtml + buildFooterNote(meta, totals);

}



export async function exportStockValuationToExcel(

  rows: StockValuationRow[],

  meta: StockValuationExportMeta,

  totals: StockValuationTotals,

): Promise<void> {

  const html = buildReportExcelDocumentHtml({

    title: REPORT_NAME,

    header: buildHeaderOptions(meta),

    bodyHtml: buildReportBodyHtml(rows, meta, totals),

    landscape: true,

  });

  downloadReportExcelHtml(html, `Stock_Valuation_${todayExportDateSuffix()}.xls`);

}



export function exportStockValuationToPdf(

  rows: StockValuationRow[],

  meta: StockValuationExportMeta,

  totals: StockValuationTotals,

): void {

  exportTabularReportToPdf({

    title: REPORT_NAME,

    header: buildHeaderOptions(meta),

    columns: COLUMNS,

    bodyHtml: buildTableRowsHtml(rows),

    footerHtml: buildTotalsFooterHtml(totals),

    footerNote: `Valuation Basis: ${meta.valuationBasis} · Total Closing Quantity: ${totals.totalClosingQty.toLocaleString("en-IN")} · Total Stock Value: ₹ ${formatMoneyNumber(totals.totalStockValue)} · ${totals.count} product line(s)`,

    landscape: true,

  });

}


