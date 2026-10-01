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
  InventoryRegisterProductRow,
  InventoryRegisterTotals,
} from "@/lib/accounts/inventory-register-compute";
import {
  formatInventoryRegisterDate,
  formatQty,
} from "@/lib/accounts/inventory-register-compute";

const REPORT_NAME = "Inventory Register";

export interface InventoryRegisterExportMeta {
  dateFrom: string;
  dateTo: string;
  financialYear: string;
  warehouse: string;
  product: string;
  category: string;
  search: string;
}

function buildHeaderOptions(meta: InventoryRegisterExportMeta): ReportHeaderOptions {
  return {
    reportTitle: REPORT_NAME,
    financialYear: meta.financialYear,
    dateFrom: meta.dateFrom,
    dateTo: meta.dateTo,
    filters: [
      { label: "Warehouse", value: meta.warehouse },
      { label: "Product", value: meta.product },
      { label: "Category", value: meta.category },
      { label: "Search", value: meta.search || "—" },
    ],
  };
}

const SUMMARY_COLUMNS: ReportColumnHeader[] = [
  { label: "Product Code" },
  { label: "Product Name" },
  { label: "Opening Stock", align: "right", className: "num" },
  { label: "Stock In", align: "right", className: "num" },
  { label: "Stock Out", align: "right", className: "num" },
  { label: "Closing Stock", align: "right", className: "num" },
  { label: "Unit" },
];

const DETAIL_COLUMNS: ReportColumnHeader[] = [
  { label: "Product Code" },
  { label: "Date" },
  { label: "Transaction Type" },
  { label: "Voucher No." },
  { label: "Reference No." },
  { label: "Party Name" },
  { label: "Warehouse" },
  { label: "Stock In", align: "right", className: "num" },
  { label: "Stock Out", align: "right", className: "num" },
  { label: "Running Balance", align: "right", className: "num" },
];

function buildSummaryRowsHtml(rows: InventoryRegisterProductRow[]): string {
  return rows
    .map(
      (r) => `<tr>
        <td class="mono">${escapeHtml(r.productCode)}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td class="num">${formatQty(r.openingStock, true)}</td>
        <td class="num">${formatQty(r.stockIn, true)}</td>
        <td class="num">${formatQty(r.stockOut, true)}</td>
        <td class="num">${formatQty(r.closingStock, true)}</td>
        <td>${escapeHtml(r.unit)}</td>
      </tr>`,
    )
    .join("");
}

function buildSummaryFooterHtml(totals: InventoryRegisterTotals): string {
  return `<tr class="total">
    <td colspan="2"><strong>Totals (${totals.totalProducts} products)</strong></td>
    <td class="num"><strong>${formatQty(totals.totalOpeningStock, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalStockIn, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalStockOut, true)}</strong></td>
    <td class="num"><strong>${formatQty(totals.totalClosingStock, true)}</strong></td>
    <td></td>
  </tr>`;
}

function buildDetailRowsHtml(
  rows: InventoryRegisterProductRow[],
  expandedProductCodes: Set<string>,
): string {
  return rows
    .flatMap((product) => {
      if (expandedProductCodes.size === 0 || !expandedProductCodes.has(product.productCode)) {
        return [];
      }
      return product.movements.map(
        (m) => `<tr>
          <td class="mono">${escapeHtml(product.productCode)}</td>
          <td>${escapeHtml(formatInventoryRegisterDate(m.date))}</td>
          <td>${escapeHtml(m.transactionTypeLabel)}</td>
          <td class="mono">${escapeHtml(m.voucherNo)}</td>
          <td>${escapeHtml(m.referenceNo)}</td>
          <td>${escapeHtml(m.partyName)}</td>
          <td>${escapeHtml(m.warehouse)}</td>
          <td class="num">${formatQty(m.stockIn)}</td>
          <td class="num">${formatQty(m.stockOut)}</td>
          <td class="num">${formatQty(m.runningBalance, true)}</td>
        </tr>`,
      );
    })
    .join("");
}

function buildReportBodyHtml(
  rows: InventoryRegisterProductRow[],
  totals: InventoryRegisterTotals,
  expandedProductCodes: Set<string>,
): string {
  const summaryTable = buildStandardReportTableHtml({
    columns: SUMMARY_COLUMNS,
    bodyHtml: buildSummaryRowsHtml(rows),
    footerHtml: buildSummaryFooterHtml(totals),
  });

  let detailSection = "";
  if (expandedProductCodes.size > 0) {
    const detailRows = buildDetailRowsHtml(rows, expandedProductCodes);
    const detailTable = buildStandardReportTableHtml({
      columns: DETAIL_COLUMNS,
      bodyHtml: detailRows || '<tr><td colspan="10">No movement details for expanded products</td></tr>',
    });
    detailSection = `<p class="report-subtitle">Stock Movement Details</p>${detailTable}`;
  }

  const footerNote = `<p class="report-footer-note">
    Total Opening: ${formatQty(totals.totalOpeningStock, true)} ·
    Total Stock In: ${formatQty(totals.totalStockIn, true)} ·
    Total Stock Out: ${formatQty(totals.totalStockOut, true)} ·
    Total Closing: ${formatQty(totals.totalClosingStock, true)}
  </p>`;

  return `<p class="report-subtitle">Product Summary</p>${summaryTable}${detailSection}${footerNote}`;
}

export async function exportInventoryRegisterToExcel(
  rows: InventoryRegisterProductRow[],
  meta: InventoryRegisterExportMeta,
  totals: InventoryRegisterTotals,
  expandedProductCodes: Set<string>,
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals, expandedProductCodes),
    landscape: true,
  });
  downloadReportExcelHtml(html, `Inventory_Register_${todayExportDateSuffix()}.xls`);
}

export function exportInventoryRegisterToPdf(
  rows: InventoryRegisterProductRow[],
  meta: InventoryRegisterExportMeta,
  totals: InventoryRegisterTotals,
  expandedProductCodes: Set<string>,
): void {
  const html = buildReportDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, totals, expandedProductCodes),
    landscape: true,
  });
  openReportPrintWindow(html);
}
