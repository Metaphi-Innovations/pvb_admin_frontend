import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  openReportPrintWindow,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-presentation";
import type {
  DocumentsSummaryRow,
  DocumentsSummaryTotals,
} from "@/lib/accounts/gstr1-documents-summary-compute";

const REPORT_NAME = "GSTR-1 — Documents Summary";

export interface DocumentsSummaryExportMeta {
  financialYear: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
  documentType: string;
}

function buildHeaderOptions(meta: DocumentsSummaryExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "Document Type", value: meta.documentType },
    ],
  };
}

function buildSummaryStripHtml(totals: DocumentsSummaryTotals): string {
  const items = [
    { label: "Sales Invoices", value: String(totals.totalSalesInvoices) },
    { label: "Credit Notes", value: String(totals.totalCreditNotes) },
    { label: "Debit Notes", value: String(totals.totalDebitNotes) },
    { label: "Total Generated", value: String(totals.totalDocumentsGenerated) },
    { label: "Cancelled", value: String(totals.totalCancelledDocuments) },
  ];
  return `<div class="summary-strip">${items
    .map(
      (item) =>
        `<div class="summary-strip-item"><label>${escapeHtml(item.label)}</label><strong>${escapeHtml(item.value)}</strong></div>`,
    )
    .join("")}</div>`;
}

const MAIN_COLUMNS: ReportColumnHeader[] = [
  { label: "Document Type" },
  { label: "First No." },
  { label: "Last No." },
  { label: "Generated", align: "right", className: "num" },
  { label: "Cancelled", align: "right", className: "num" },
  { label: "Active", align: "right", className: "num" },
];

function buildMainTableRowsHtml(rows: DocumentsSummaryRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.documentTypeLabel)}</td>
        <td class="mono">${escapeHtml(r.firstDocumentNo)}</td>
        <td class="mono">${escapeHtml(r.lastDocumentNo)}</td>
        <td class="num">${r.totalGenerated}</td>
        <td class="num">${r.cancelledCount}</td>
        <td class="num">${r.activeCount}</td>
      </tr>`,
    )
    .join("");
}

function buildReportBodyHtml(rows: DocumentsSummaryRow[], totals: DocumentsSummaryTotals): string {
  const mainTable = buildStandardReportTableHtml({
    columns: MAIN_COLUMNS,
    bodyHtml: buildMainTableRowsHtml(rows),
  });
  return `${buildSummaryStripHtml(totals)}${mainTable}`;
}

export async function exportDocumentsSummaryToExcel(
  rows: DocumentsSummaryRow[],
  totals: DocumentsSummaryTotals,
  meta: DocumentsSummaryExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
  });
  downloadReportExcelHtml(html, `GSTR1_Documents_Summary_${todayExportDateSuffix()}.xls`);
}

export function exportDocumentsSummaryToPdf(
  rows: DocumentsSummaryRow[],
  totals: DocumentsSummaryTotals,
  meta: DocumentsSummaryExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
  });
  openReportPrintWindow(html);
}
