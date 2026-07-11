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

import type { TdsSummaryExportRow, TdsSummaryTotals } from "./tds-summary-data";



const REPORT_NAME = "TDS Summary";



export interface TdsSummaryExportMeta {

  dateFrom: string;

  dateTo: string;

  financialYear: string;

  partyType: string;

  tdsSection: string;

  search: string;

}



function buildHeaderOptions(meta: TdsSummaryExportMeta): ReportHeaderOptions {

  return {

    reportTitle: REPORT_NAME,

    financialYear: meta.financialYear,

    dateFrom: meta.dateFrom,

    dateTo: meta.dateTo,

    filters: [

      { label: "Party Type", value: meta.partyType },

      { label: "TDS Section", value: meta.tdsSection },

      { label: "Search", value: meta.search || "—" },

    ],

  };

}



const COLUMNS: ReportColumnHeader[] = [

  { label: "Party Name" },

  { label: "Party Type" },

  { label: "PAN" },

  { label: "TDS Section" },

  { label: "Gross Amount (₹)", align: "right", className: "num" },

  { label: "TDS Rate", align: "right", className: "num" },

  { label: "TDS Amount (₹)", align: "right", className: "num" },

  { label: "Net Payable (₹)", align: "right", className: "num" },

];



function buildTableRowsHtml(rows: TdsSummaryExportRow[]): string {

  return rows

    .filter((r) => r.rowType !== "total")

    .map((r) => {

      const rowClass = r.rowType === "section" ? "section" : "line";

      return `<tr class="${rowClass}">

        <td>${escapeHtml(r.partyName)}</td>

        <td>${escapeHtml(r.partyType)}</td>

        <td class="mono">${escapeHtml(r.pan)}</td>

        <td class="mono">${escapeHtml(r.tdsSection)}</td>

        <td class="num">${formatExportAmount(r.grossAmount)}</td>

        <td class="num">${escapeHtml(r.tdsRate)}</td>

        <td class="num">${formatExportAmount(r.tdsAmount)}</td>

        <td class="num">${formatExportAmount(r.netPayable)}</td>

      </tr>`;

    })

    .join("");

}



function buildTotalsFooterHtml(totals: TdsSummaryTotals): string {

  return `<tr class="total">

    <td colspan="4"><strong>Totals</strong></td>

    <td class="num"><strong>${formatExportAmount(totals.totalGross)}</strong></td>

    <td></td>

    <td class="num"><strong>${formatExportAmount(totals.totalTds)}</strong></td>

    <td class="num"><strong>${formatExportAmount(totals.totalNet)}</strong></td>

  </tr>`;

}



function buildFooterNote(totals: TdsSummaryTotals): string {

  return `<p class="report-footer-note">

    Total Gross: ₹ ${formatMoneyNumber(totals.totalGross)} ·

    Total TDS: ₹ ${formatMoneyNumber(totals.totalTds)} ·

    Total Net Payable: ₹ ${formatMoneyNumber(totals.totalNet)}

  </p>`;

}



function buildReportBodyHtml(rows: TdsSummaryExportRow[], totals: TdsSummaryTotals): string {

  const tableHtml = buildStandardReportTableHtml({

    columns: COLUMNS,

    bodyHtml: buildTableRowsHtml(rows),

    footerHtml: buildTotalsFooterHtml(totals),

  });

  return tableHtml + buildFooterNote(totals);

}



export async function exportTdsSummaryToExcel(

  rows: TdsSummaryExportRow[],

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

  rows: TdsSummaryExportRow[],

  meta: TdsSummaryExportMeta,

  totals: TdsSummaryTotals,

): void {

  exportTabularReportToPdf({

    title: REPORT_NAME,

    header: buildHeaderOptions(meta),

    columns: COLUMNS,

    bodyHtml: buildTableRowsHtml(rows),

    footerHtml: buildTotalsFooterHtml(totals),

    footerNote: `Total Gross: ₹ ${formatMoneyNumber(totals.totalGross)} · Total TDS: ₹ ${formatMoneyNumber(totals.totalTds)} · Total Net Payable: ₹ ${formatMoneyNumber(totals.totalNet)}`,

    landscape: true,

  });

}


