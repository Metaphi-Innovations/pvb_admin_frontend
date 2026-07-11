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
import {
  subsectionLabel,
  type GstCreditDebitNoteRow,
  type GstCreditDebitSummaryTotals,
} from "@/lib/accounts/gstr1-credit-debit-compute";

const REPORT_NAME = "GSTR-1 — Credit / Debit Notes";

export interface GstCreditDebitExportMeta {
  financialYear: string;
  dateFrom: string;
  dateTo: string;
  branch: string;
  warehouse: string;
  customer: string;
  noteType: string;
  noteNo: string;
  status: string;
  subsection: string;
}

function buildHeaderOptions(meta: GstCreditDebitExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "Customer", value: meta.customer },
      { label: "Note Type", value: meta.noteType },
      { label: "Note Number", value: meta.noteNo || "—" },
      { label: "Status", value: meta.status },
      { label: "Subsection", value: meta.subsection },
    ],
  };
}

function buildSummaryStripHtml(totals: GstCreditDebitSummaryTotals): string {
  const items = [
    { label: "Credit Notes", value: String(totals.totalCreditNotes) },
    { label: "Debit Notes", value: String(totals.totalDebitNotes) },
    { label: "Taxable", value: `₹ ${formatMoneyNumber(totals.totalTaxableValue)}` },
    { label: "GST", value: `₹ ${formatMoneyNumber(totals.totalGst)}` },
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
  { label: "Section" },
  { label: "Type" },
  { label: "Date" },
  { label: "Note No." },
  { label: "Orig. Inv." },
  { label: "Orig. Date" },
  { label: "Customer" },
  { label: "GSTIN" },
  { label: "Reg." },
  { label: "Taxable (₹)", align: "right", className: "num" },
  { label: "Rate" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "Total (₹)", align: "right", className: "num" },
  { label: "Reason" },
  { label: "Status" },
];

const BREAKUP_COLUMNS: ReportColumnHeader[] = [
  { label: "Note No." },
  { label: "Rate", align: "right", className: "num" },
  { label: "Taxable (₹)", align: "right", className: "num" },
  { label: "CGST (₹)", align: "right", className: "num" },
  { label: "SGST (₹)", align: "right", className: "num" },
  { label: "IGST (₹)", align: "right", className: "num" },
  { label: "Tax (₹)", align: "right", className: "num" },
];

function buildMainTableRowsHtml(rows: GstCreditDebitNoteRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(subsectionLabel(r.subsection))}</td>
        <td>${r.docType === "credit_note" ? "Credit" : "Debit"}</td>
        <td>${escapeHtml(r.noteDate)}</td>
        <td class="mono">${escapeHtml(r.noteNumber)}</td>
        <td class="mono">${escapeHtml(r.originalInvoiceNo)}</td>
        <td>${escapeHtml(r.originalInvoiceDate)}</td>
        <td>${escapeHtml(r.customerName)}</td>
        <td class="mono">${escapeHtml(r.gstin)}</td>
        <td>${escapeHtml(r.registrationType)}</td>
        <td class="num">${formatExportAmount(r.taxableValue)}</td>
        <td>${escapeHtml(r.gstRateLabel)}</td>
        <td class="num">${formatExportAmount(r.cgst)}</td>
        <td class="num">${formatExportAmount(r.sgst)}</td>
        <td class="num">${formatExportAmount(r.igst)}</td>
        <td class="num">${formatExportAmount(r.totalAmount)}</td>
        <td>${escapeHtml(r.reason)}</td>
        <td>${r.status === "exception" ? "Exception" : "Valid"}</td>
      </tr>`,
    )
    .join("");
}

function buildBreakupTableRowsHtml(rows: GstCreditDebitNoteRow[]): string {
  return rows
    .flatMap((r) =>
      r.rateBreakups.map(
        (b) => `<tr>
          <td class="mono">${escapeHtml(r.noteNumber)}</td>
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

function buildReportBodyHtml(rows: GstCreditDebitNoteRow[], totals: GstCreditDebitSummaryTotals): string {
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

export async function exportGstCreditDebitToExcel(
  rows: GstCreditDebitNoteRow[],
  totals: GstCreditDebitSummaryTotals,
  meta: GstCreditDebitExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals),
    landscape: true,
    compact: true,
  });
  downloadReportExcelHtml(html, `GSTR1_Credit_Debit_Notes_${todayExportDateSuffix()}.xls`);
}

export function exportGstCreditDebitToPdf(
  rows: GstCreditDebitNoteRow[],
  totals: GstCreditDebitSummaryTotals,
  meta: GstCreditDebitExportMeta,
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
