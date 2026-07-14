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
import { formatMoney } from "@/lib/accounts/money-format";
import {
  formatQty,
  formatStockRegisterDate,
  type StockRegisterBatchWiseRow,
  type StockRegisterBatchWiseTotals,
  type StockRegisterDetailedRow,
  type StockRegisterDetailedTotals,
  type StockRegisterSummaryRow,
  type StockRegisterSummaryTotals,
  type StockRegisterTab,
} from "@/lib/accounts/stock-register-compute";

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
  { label: "Rate", align: "right", className: "num" },
  { label: "Closing Stock Value", align: "right", className: "num" },
];

const DETAILED_COLUMNS: ReportColumnHeader[] = [
  { label: "Product Name" },
  { label: "Batch Number" },
  { label: "Manufacturing Date" },
  { label: "Expiry Date" },
  { label: "Opening Stock", align: "right", className: "num" },
  { label: "Purchase Quantity", align: "right", className: "num" },
  { label: "Purchase Return Quantity", align: "right", className: "num" },
  { label: "Net Purchase", align: "right", className: "num" },
  { label: "Sales Quantity", align: "right", className: "num" },
  { label: "Sales Return Quantity", align: "right", className: "num" },
  { label: "Net Sales", align: "right", className: "num" },
  { label: "Stock Transfer In", align: "right", className: "num" },
  { label: "Stock Transfer Out", align: "right", className: "num" },
  { label: "Sample Return", align: "right", className: "num" },
  { label: "Sample Issue", align: "right", className: "num" },
  { label: "Positive Adjustment", align: "right", className: "num" },
  { label: "Negative Adjustment", align: "right", className: "num" },
  { label: "Closing Stock", align: "right", className: "num" },
  { label: "Rate", align: "right", className: "num" },
  { label: "Closing Value", align: "right", className: "num" },
];

const BATCH_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher Type" },
  { label: "Voucher Number" },
  { label: "Product Name" },
  { label: "Batch Number" },
  { label: "Manufacturing Date" },
  { label: "Expiry Date" },
  { label: "Warehouse" },
  { label: "Party Name" },
  { label: "Quantity In", align: "right", className: "num" },
  { label: "Quantity Out", align: "right", className: "num" },
  { label: "Running Balance Quantity", align: "right", className: "num" },
  { label: "Rate", align: "right", className: "num" },
  { label: "Value", align: "right", className: "num" },
  { label: "Remarks" },
];

function summaryBody(rows: StockRegisterSummaryRow[], totals: StockRegisterSummaryTotals): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.productName)}</td>
        <td class="num">${formatQty(r.openingQty, true)}</td>
        <td class="num">${formatQty(r.inwardQty, true)}</td>
        <td class="num">${formatQty(r.outwardQty, true)}</td>
        <td class="num">${formatQty(r.closingQty, true)}</td>
        <td class="num">${formatMoney(r.rate)}</td>
        <td class="num">${formatMoney(r.closingValue)}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td><strong>Totals (${totals.totalProducts} products)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOpeningQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalInwardQty, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOutwardQty, true)}</strong></td>
    <td></td>
    <td></td>
    <td class="num"><strong>${formatMoney(totals.totalClosingValue)}</strong></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: SUMMARY_COLUMNS, bodyHtml: body, footerHtml: footer });
}

function detailedBody(rows: StockRegisterDetailedRow[], totals: StockRegisterDetailedTotals): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(r.productName)}</td>
        <td class="mono">${escapeHtml(r.batchNo)}</td>
        <td>${escapeHtml(r.mfgDate ? formatStockRegisterDate(r.mfgDate) : "—")}</td>
        <td>${escapeHtml(r.expiryDate ? formatStockRegisterDate(r.expiryDate) : "—")}</td>
        <td class="num">${formatQty(r.openingStock, true)}</td>
        <td class="num">${formatQty(r.purchaseQty, true)}</td>
        <td class="num">${formatQty(r.purchaseReturnQty, true)}</td>
        <td class="num">${formatQty(r.netPurchase, true)}</td>
        <td class="num">${formatQty(r.salesQty, true)}</td>
        <td class="num">${formatQty(r.salesReturnQty, true)}</td>
        <td class="num">${formatQty(r.netSales, true)}</td>
        <td class="num">${formatQty(r.stockTransferIn, true)}</td>
        <td class="num">${formatQty(r.stockTransferOut, true)}</td>
        <td class="num">${formatQty(r.sampleReturn, true)}</td>
        <td class="num">${formatQty(r.sampleIssue, true)}</td>
        <td class="num">${formatQty(r.positiveAdjustment, true)}</td>
        <td class="num">${formatQty(r.negativeAdjustment, true)}</td>
        <td class="num">${formatQty(r.closingStock, true)}</td>
        <td class="num">${formatMoney(r.rate)}</td>
        <td class="num">${formatMoney(r.closingValue)}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td colspan="4"><strong>Totals (${totals.totalProducts} products / ${totals.totalBatches} batches)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOpeningQty, true)}</strong></td>
    <td colspan="12"></td>
    <td class="num"><strong>${formatQty(totals.totalClosingQty, true)}</strong></td>
    <td></td>
    <td class="num"><strong>${formatMoney(totals.totalClosingValue)}</strong></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: DETAILED_COLUMNS, bodyHtml: body, footerHtml: footer });
}

function batchBody(rows: StockRegisterBatchWiseRow[], totals: StockRegisterBatchWiseTotals): string {
  const body = rows
    .map(
      (r) => `<tr>
        <td>${escapeHtml(formatStockRegisterDate(r.date))}</td>
        <td>${escapeHtml(r.voucherType)}</td>
        <td class="mono">${escapeHtml(r.voucherNumber)}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td class="mono">${escapeHtml(r.batchNo)}</td>
        <td>${escapeHtml(r.mfgDate ? formatStockRegisterDate(r.mfgDate) : "—")}</td>
        <td>${escapeHtml(r.expiryDate ? formatStockRegisterDate(r.expiryDate) : "—")}</td>
        <td>${escapeHtml(r.warehouse)}</td>
        <td>${escapeHtml(r.partyName)}</td>
        <td class="num">${formatQty(r.quantityIn)}</td>
        <td class="num">${formatQty(r.quantityOut)}</td>
        <td class="num">${formatQty(r.runningBalanceQty, true)}</td>
        <td class="num">${formatMoney(r.rate)}</td>
        <td class="num">${formatMoney(r.value)}</td>
        <td>${escapeHtml(r.remarks || "—")}</td>
      </tr>`,
    )
    .join("");
  const footer = `<tr class="total">
    <td colspan="9"><strong>Totals (${totals.totalTransactions} transactions)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalQuantityIn, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalQuantityOut, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.currentBalanceQty, true)}</strong></td>
    <td></td>
    <td class="num"><strong>${formatMoney(totals.totalMovementValue)}</strong></td>
    <td></td>
  </tr>`;
  return buildStandardReportTableHtml({ columns: BATCH_COLUMNS, bodyHtml: body, footerHtml: footer });
}

export async function exportStockRegisterToExcel(
  tab: StockRegisterTab,
  rows: StockRegisterSummaryRow[] | StockRegisterDetailedRow[] | StockRegisterBatchWiseRow[],
  totals: StockRegisterSummaryTotals | StockRegisterDetailedTotals | StockRegisterBatchWiseTotals,
  meta: StockRegisterExportMeta,
): Promise<void> {
  let bodyHtml = "";
  if (tab === "summary") {
    bodyHtml = summaryBody(rows as StockRegisterSummaryRow[], totals as StockRegisterSummaryTotals);
  } else if (tab === "detailed") {
    bodyHtml = detailedBody(rows as StockRegisterDetailedRow[], totals as StockRegisterDetailedTotals);
  } else {
    bodyHtml = batchBody(rows as StockRegisterBatchWiseRow[], totals as StockRegisterBatchWiseTotals);
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
  rows: StockRegisterSummaryRow[] | StockRegisterDetailedRow[] | StockRegisterBatchWiseRow[],
  totals: StockRegisterSummaryTotals | StockRegisterDetailedTotals | StockRegisterBatchWiseTotals,
  meta: StockRegisterExportMeta,
): void {
  let bodyHtml = "";
  if (tab === "summary") {
    bodyHtml = summaryBody(rows as StockRegisterSummaryRow[], totals as StockRegisterSummaryTotals);
  } else if (tab === "detailed") {
    bodyHtml = detailedBody(rows as StockRegisterDetailedRow[], totals as StockRegisterDetailedTotals);
  } else {
    bodyHtml = batchBody(rows as StockRegisterBatchWiseRow[], totals as StockRegisterBatchWiseTotals);
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
