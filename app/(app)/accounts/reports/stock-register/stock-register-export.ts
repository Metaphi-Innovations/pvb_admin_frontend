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
import {
  formatQty,
  formatStockRegisterDate,
  type StockRegisterBatchWiseRow,
  type StockRegisterBatchWiseTotals,
  type StockRegisterSummaryRow,
  type StockRegisterSummaryTotals,
  type StockRegisterTab,
} from "@/lib/accounts/stock-register-compute";

export interface StockRegisterBatchSummaryRow {
  rowKey: string;
  productName: string;
  productCode: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  warehouse: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
}

export interface StockRegisterBatchSummaryTotals {
  totalProducts: number;
  totalBatches: number;
  totalOpeningQty: number;
  totalInwardQty: number;
  totalOutwardQty: number;
  totalClosingQty: number;
}

export interface StockRegisterExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  branch: string;
  warehouse: string;
  product: string;
  category: string;
  batchNo: string;
  tab: StockRegisterTab;
}

function reportTitle(tab: StockRegisterTab): string {
  switch (tab) {
    case "summary":
      return "Stock Register – Summary";
    case "detailed":
      return "Stock Register – Detailed";
    case "batch-wise":
      return "Stock Register – Batch Wise";
  }
}

function buildHeaderOptions(meta: StockRegisterExportMeta): ReportHeaderOptions {
  return {
    reportTitle: reportTitle(meta.tab),
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Branch", value: meta.branch },
      { label: "Warehouse", value: meta.warehouse },
      { label: "Product", value: meta.product },
      { label: "Category", value: meta.category },
      { label: "Batch Number", value: meta.batchNo },
    ],
  };
}

const SUMMARY_COLUMNS: ReportColumnHeader[] = [
  { label: "Product Name" },
  { label: "Opening Quantity", align: "right", className: "num" },
  { label: "Inward Quantity", align: "right", className: "num" },
  { label: "Outward Quantity", align: "right", className: "num" },
  { label: "Closing Quantity", align: "right", className: "num" },
];

const DETAILED_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher Type" },
  { label: "Voucher Number" },
  { label: "Product Name" },
  { label: "Warehouse" },
  { label: "Party Name" },
  { label: "Quantity In", align: "right", className: "num" },
  { label: "Quantity Out", align: "right", className: "num" },
  { label: "Balance Quantity", align: "right", className: "num" },
];

const BATCH_COLUMNS: ReportColumnHeader[] = [
  { label: "Product Name" },
  { label: "Batch Number" },
  { label: "Manufacturing Date" },
  { label: "Expiry Date" },
  { label: "Warehouse" },
  { label: "Opening Quantity", align: "right", className: "num" },
  { label: "Inward Quantity", align: "right", className: "num" },
  { label: "Outward Quantity", align: "right", className: "num" },
  { label: "Closing Quantity", align: "right", className: "num" },
];

function summaryBody(rows: StockRegisterSummaryRow[], totals: StockRegisterSummaryTotals & { totalClosingQty?: number }): string {
  const totalClosingQty =
    totals.totalClosingQty ?? rows.reduce((s, r) => s + r.closingQty, 0);
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.productName)}</td>
        <td class="num">${formatQty(r.openingQty, true)}</td>
        <td class="num">${formatQty(r.inwardQty, true)}</td>
        <td class="num">${formatQty(r.outwardQty, true)}</td>
        <td class="num">${formatQty(r.closingQty, true)}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td><strong>Totals (${totals.totalProducts} products)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOpeningQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalInwardQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOutwardQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totalClosingQty, true)}</strong></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: SUMMARY_COLUMNS, bodyHtml: body, footerHtml: footer });
}

function detailedBody(rows: StockRegisterBatchWiseRow[], totals: StockRegisterBatchWiseTotals): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(formatStockRegisterDate(r.date))}</td>
        <td>${escapeHtml(r.voucherType)}</td>
        <td class="mono">${escapeHtml(r.voucherNumber)}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td>${escapeHtml(r.warehouse)}</td>
        <td>${escapeHtml(r.partyName)}</td>
        <td class="num">${formatQty(r.quantityIn)}</td>
        <td class="num">${formatQty(r.quantityOut)}</td>
        <td class="num">${formatQty(r.runningBalanceQty, true)}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td colspan="6"><strong>Totals (${totals.totalTransactions} transactions)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalQuantityIn, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalQuantityOut, true)}</strong></td>
    <td></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: DETAILED_COLUMNS, bodyHtml: body, footerHtml: footer });
}

function batchBody(rows: StockRegisterBatchSummaryRow[], totals: StockRegisterBatchSummaryTotals): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.productName)}</td>
        <td class="mono">${escapeHtml(r.batchNo)}</td>
        <td>${escapeHtml(r.mfgDate ? formatStockRegisterDate(r.mfgDate) : "—")}</td>
        <td>${escapeHtml(r.expiryDate ? formatStockRegisterDate(r.expiryDate) : "—")}</td>
        <td>${escapeHtml(r.warehouse)}</td>
        <td class="num">${formatQty(r.openingQty, true)}</td>
        <td class="num">${formatQty(r.inwardQty, true)}</td>
        <td class="num">${formatQty(r.outwardQty, true)}</td>
        <td class="num">${formatQty(r.closingQty, true)}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td colspan="5"><strong>Totals (${totals.totalBatches} batches / ${totals.totalProducts} products)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOpeningQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalInwardQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOutwardQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalClosingQty, true)}</strong></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: BATCH_COLUMNS, bodyHtml: body, footerHtml: footer });
}

type ExportRows =
  | StockRegisterSummaryRow[]
  | StockRegisterBatchWiseRow[]
  | StockRegisterBatchSummaryRow[];

type ExportTotals =
  | (StockRegisterSummaryTotals & { totalClosingQty?: number })
  | StockRegisterBatchWiseTotals
  | StockRegisterBatchSummaryTotals;

export async function exportStockRegisterToExcel(
  tab: StockRegisterTab,
  rows: ExportRows,
  totals: ExportTotals,
  meta: StockRegisterExportMeta,
): Promise<void> {
  let bodyHtml = "";
  if (tab === "summary") {
    bodyHtml = summaryBody(rows as StockRegisterSummaryRow[], totals as StockRegisterSummaryTotals & { totalClosingQty?: number });
  } else if (tab === "detailed") {
    bodyHtml = detailedBody(rows as StockRegisterBatchWiseRow[], totals as StockRegisterBatchWiseTotals);
  } else {
    bodyHtml = batchBody(rows as StockRegisterBatchSummaryRow[], totals as StockRegisterBatchSummaryTotals);
  }

  const title = reportTitle(tab);
  const html = buildReportExcelDocumentHtml({
    title,
    header: buildHeaderOptions(meta),
    bodyHtml,
    landscape: true,
  });
  downloadReportExcelHtml(html, `Stock_Register_${tab}_${todayExportDateSuffix()}.xls`);
}

export function exportStockRegisterToPdf(
  tab: StockRegisterTab,
  rows: ExportRows,
  totals: ExportTotals,
  meta: StockRegisterExportMeta,
): void {
  let bodyHtml = "";
  if (tab === "summary") {
    bodyHtml = summaryBody(rows as StockRegisterSummaryRow[], totals as StockRegisterSummaryTotals & { totalClosingQty?: number });
  } else if (tab === "detailed") {
    bodyHtml = detailedBody(rows as StockRegisterBatchWiseRow[], totals as StockRegisterBatchWiseTotals);
  } else {
    bodyHtml = batchBody(rows as StockRegisterBatchSummaryRow[], totals as StockRegisterBatchSummaryTotals);
  }

  const title = reportTitle(tab);
  const html = buildReportDocumentHtml({
    title,
    header: buildHeaderOptions(meta),
    bodyHtml,
    landscape: true,
  });
  openReportPrintWindow(html);
}
