import {
  buildReportDocumentHtml,
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  formatExportAmount,
  openReportPrintWindow,
  todayExportDateSuffix,
  type ReportColumnHeader,
  type ReportHeaderOptions,
} from "@/lib/accounts/report-export-presentation";
import type {
  GstDashboardExportRow,
  GstSummaryCardExportRow,
} from "./gst-summary-data";

const DASHBOARD_REPORT_NAME = "GST Summary Dashboard";

export interface GstDashboardExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  branch: string;
  warehouse: string;
}

function buildDashboardHeaderOptions(meta: GstDashboardExportMeta): ReportHeaderOptions {
  return {
    reportTitle: DASHBOARD_REPORT_NAME,
    financialYear: meta.financialYear || "All years",
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
    ],
  };
}

const CARD_COLUMNS: ReportColumnHeader[] = [
  { label: "Metric" },
  { label: "Value", align: "right", className: "num" },
];

const SECTION_COLUMNS: ReportColumnHeader[] = [
  { label: "Section" },
  { label: "Document Count", align: "right", className: "num" },
  { label: "Taxable Value (₹)", align: "right", className: "num" },
  { label: "Tax Amount (₹)", align: "right", className: "num" },
  { label: "Exceptions", align: "right", className: "num" },
];

function buildDashboardBodyHtml(
  cards: GstSummaryCardExportRow[],
  sections: GstDashboardExportRow[],
): string {
  const cardRows = cards
    .map(
      (c) => `<tr>
        <td>${escapeHtml(c.label)}</td>
        <td class="num">${typeof c.value === "number" ? formatExportAmount(c.value) : escapeHtml(String(c.value))}</td>
      </tr>`,
    )
    .join("");

  const sectionRows = sections
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.section)}</td>
        <td class="num">${r.documentCount}</td>
        <td class="num">${formatExportAmount(r.taxableValue)}</td>
        <td class="num">${formatExportAmount(r.taxAmount)}</td>
        <td class="num">${r.exceptions}</td>
      </tr>`,
    )
    .join("");

  const cardsTable = buildStandardReportTableHtml({
    columns: CARD_COLUMNS,
    bodyHtml: cardRows,
  });

  const sectionsTable = buildStandardReportTableHtml({
    columns: SECTION_COLUMNS,
    bodyHtml: sectionRows,
  });

  return `<p class="report-subtitle">Summary Cards</p>${cardsTable}<p class="report-subtitle">GSTR-1 Section Summary</p>${sectionsTable}`;
}

export async function exportGstDashboardToExcel(
  cards: GstSummaryCardExportRow[],
  sections: GstDashboardExportRow[],
  meta: GstDashboardExportMeta,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: DASHBOARD_REPORT_NAME,
    header: buildDashboardHeaderOptions(meta),
    bodyHtml: buildDashboardBodyHtml(cards, sections),
    footerHtml:
      '<p class="report-footer-note">Outward GST summary for GSTR-1 preparation — not a filing submission.</p>',
  });
  downloadReportExcelHtml(html, `GST_Summary_Dashboard_${todayExportDateSuffix()}.xls`);
}

export function exportGstDashboardToPdf(
  cards: GstSummaryCardExportRow[],
  sections: GstDashboardExportRow[],
  meta: GstDashboardExportMeta,
): void {
  const html = buildReportDocumentHtml({
    title: DASHBOARD_REPORT_NAME,
    header: buildDashboardHeaderOptions(meta),
    bodyHtml: buildDashboardBodyHtml(cards, sections),
    footerHtml:
      '<p class="report-footer-note">Outward GST summary for GSTR-1 preparation — not a filing submission.</p>',
  });
  openReportPrintWindow(html);
}

/** @deprecated Legacy export — retained for type compatibility during migration */
export interface GstSummaryExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  gstType: string;
  gstRate: string;
  search: string;
}

export interface GstSummaryTotals {
  totalOutputGst: number;
  totalInputGst: number;
  netGstPayable: number;
}

export interface GstSummaryExportRow {
  gstType: string;
  taxableValue: number | null;
  cgst: number | null;
  sgst: number | null;
  igst: number | null;
  totalGst: number | null;
  totalInvoiceValue: number | null;
  rowType: string;
}

const LEGACY_SUMMARY_COLUMNS: ReportColumnHeader[] = [
  { label: "Metric" },
  { label: "Amount (₹)", align: "right", className: "num" },
];

function buildLegacySummaryBodyHtml(totals: GstSummaryTotals): string {
  const rows = [
    ["Total Output GST", formatExportAmount(totals.totalOutputGst)],
    ["Total Input GST", formatExportAmount(totals.totalInputGst)],
    ["Net GST Payable / Receivable", formatExportAmount(totals.netGstPayable)],
  ]
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td class="num">${value}</td></tr>`)
    .join("");

  return buildStandardReportTableHtml({ columns: LEGACY_SUMMARY_COLUMNS, bodyHtml: rows });
}

function buildLegacyHeaderOptions(meta: GstSummaryExportMeta): ReportHeaderOptions {
  return {
    reportTitle: "GST Summary",
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "GST Type", value: meta.gstType },
      { label: "GST Rate", value: meta.gstRate },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

export async function exportGstSummaryToExcel(
  _rows: GstSummaryExportRow[],
  meta: GstSummaryExportMeta,
  totals: GstSummaryTotals,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: "GST Summary",
    header: buildLegacyHeaderOptions(meta),
    bodyHtml: buildLegacySummaryBodyHtml(totals),
  });
  downloadReportExcelHtml(html, `GST_Summary_${todayExportDateSuffix()}.xls`);
}

export function exportGstSummaryToPdf(
  _rows: GstSummaryExportRow[],
  meta: GstSummaryExportMeta,
  totals: GstSummaryTotals,
): void {
  exportTabularReportToPdf({
    title: "GST Summary",
    header: buildLegacyHeaderOptions(meta),
    columns: LEGACY_SUMMARY_COLUMNS,
    bodyHtml: [
      `<tr><td>${escapeHtml("Total Output GST")}</td><td class="num">${formatExportAmount(totals.totalOutputGst)}</td></tr>`,
      `<tr><td>${escapeHtml("Total Input GST")}</td><td class="num">${formatExportAmount(totals.totalInputGst)}</td></tr>`,
      `<tr class="total"><td>${escapeHtml("Net GST Payable / Receivable")}</td><td class="num">${formatExportAmount(totals.netGstPayable)}</td></tr>`,
    ].join(""),
  });
}
