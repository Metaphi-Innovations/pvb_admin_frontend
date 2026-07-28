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
import {
  formatQtyWithUnit,
  getCostRateMethodLabel,
  type CostRateMethod,
  type StockValuationRow,
  type StockValuationTab,
  type StockValuationTotals,
} from "./stock-valuation-data";

const REPORT_NAME = "Stock Valuation";

export type StockValuationExportBasis = "cost" | "market";

export interface StockValuationExportMeta {
  asOnDate: string;
  financialYear: string;
  costRateMethod: CostRateMethod;
  warehouse: string;
  product: string;
  stockStatus: string;
  grouping: string;
  tab: StockValuationTab;
  /** When false, Warehouse column is omitted (Product-wise grouping). */
  showWarehouse: boolean;
  exportBasis: StockValuationExportBasis;
}

function formatExportQty(qty: number, unit: string): string {
  return formatQtyWithUnit(qty, unit);
}

function formatExportOptional(
  value: number | null | undefined,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  return formatExportAmount(value);
}

function basisLabel(basis: StockValuationExportBasis): string {
  return basis === "market" ? "Market Valuation" : "Cost Valuation";
}

function buildHeaderOptions(meta: StockValuationExportMeta): ReportHeaderOptions {
  const tabLabel = meta.tab === "detailed" ? "Detailed" : "Summary";
  return {
    reportTitle: `${REPORT_NAME} — ${tabLabel}`,
    financialYear: meta.financialYear,
    reportPeriod: `As on ${meta.asOnDate}`,
    subtitle: `${basisLabel(meta.exportBasis)} · Cost Rate Method: ${getCostRateMethodLabel(meta.costRateMethod)} · Grouping: ${meta.grouping}`,
    filters: [
      { label: "Warehouse", value: meta.warehouse },
      { label: "Product", value: meta.product },
      { label: "Stock Status", value: meta.stockStatus },
      { label: "View", value: tabLabel },
      { label: "Valuation Basis", value: basisLabel(meta.exportBasis) },
    ],
  };
}

function summaryColumns(showWarehouse: boolean, basis: StockValuationExportBasis): ReportColumnHeader[] {
  const cols: ReportColumnHeader[] = [{ label: "Product Name / Stock Item" }];
  if (showWarehouse) cols.push({ label: "Warehouse" });
  cols.push({ label: "Closing Quantity", align: "right", className: "num" });
  if (basis === "cost") {
    cols.push(
      { label: "Cost Rate (₹)", align: "right", className: "num" },
      { label: "Cost Value (₹)", align: "right", className: "num" },
    );
  } else {
    cols.push(
      { label: "Market Rate (₹)", align: "right", className: "num" },
      { label: "Market Value (₹)", align: "right", className: "num" },
    );
  }
  return cols;
}

function detailedColumns(showWarehouse: boolean, basis: StockValuationExportBasis): ReportColumnHeader[] {
  const cols: ReportColumnHeader[] = [{ label: "Product Name / Stock Item" }];
  if (showWarehouse) cols.push({ label: "Warehouse" });
  cols.push(
    { label: "Opening Quantity", align: "right", className: "num" },
    { label: "Inward Quantity", align: "right", className: "num" },
    { label: "Outward Quantity", align: "right", className: "num" },
    { label: "Closing Quantity", align: "right", className: "num" },
  );
  if (basis === "cost") {
    cols.push(
      { label: "Cost Rate (₹)", align: "right", className: "num" },
      { label: "Cost Value (₹)", align: "right", className: "num" },
    );
  } else {
    cols.push(
      { label: "Market Rate (₹)", align: "right", className: "num" },
      { label: "Market Value (₹)", align: "right", className: "num" },
    );
  }
  return cols;
}

function rateValueCells(row: StockValuationRow, basis: StockValuationExportBasis): string {
  if (basis === "cost") {
    return `<td class="num">${row.costRateMissing ? "—" : formatExportAmount(row.costRate)}</td>
      <td class="num">${row.costRateMissing && row.closingQty !== 0 ? "—" : formatExportAmount(row.costValue)}</td>`;
  }
  return `<td class="num">${formatExportOptional(row.marketRate, row.marketRateMissing)}</td>
    <td class="num">${formatExportOptional(row.marketValue, row.marketRateMissing)}</td>`;
}

function warehouseCell(row: StockValuationRow, showWarehouse: boolean): string {
  return showWarehouse ? `<td>${escapeHtml(row.warehouse)}</td>` : "";
}

function buildSummaryRowsHtml(
  rows: StockValuationRow[],
  showWarehouse: boolean,
  basis: StockValuationExportBasis,
): string {
  return rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.productName)}</td>
        ${warehouseCell(row, showWarehouse)}
        <td class="num">${escapeHtml(formatExportQty(row.closingQty, row.unit))}</td>
        ${rateValueCells(row, basis)}
      </tr>`,
    )
    .join("");
}

function buildDetailedRowsHtml(
  rows: StockValuationRow[],
  showWarehouse: boolean,
  basis: StockValuationExportBasis,
): string {
  return rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.productName)}</td>
        ${warehouseCell(row, showWarehouse)}
        <td class="num">${escapeHtml(formatExportQty(row.openingQty, row.unit))}</td>
        <td class="num">${escapeHtml(formatExportQty(row.inwardQty, row.unit))}</td>
        <td class="num">${escapeHtml(formatExportQty(row.outwardQty, row.unit))}</td>
        <td class="num">${escapeHtml(formatExportQty(row.closingQty, row.unit))}</td>
        ${rateValueCells(row, basis)}
      </tr>`,
    )
    .join("");
}

function valueTotal(totals: StockValuationTotals, basis: StockValuationExportBasis): string {
  if (basis === "cost") return formatExportAmount(totals.totalCostValue);
  if (!totals.marketValueAvailable || totals.totalMarketValue == null) return "—";
  return formatExportAmount(totals.totalMarketValue);
}

function buildSummaryTotalsHtml(
  totals: StockValuationTotals,
  showWarehouse: boolean,
  basis: StockValuationExportBasis,
): string {
  const span = showWarehouse ? 2 : 1;
  return `<tr class="total">
    <td colspan="${span}"><strong>Totals</strong></td>
    <td class="num"><strong>${totals.totalClosingQty.toLocaleString("en-IN")}</strong></td>
    <td></td>
    <td class="num"><strong>${valueTotal(totals, basis)}</strong></td>
  </tr>`;
}

function buildDetailedTotalsHtml(
  totals: StockValuationTotals,
  showWarehouse: boolean,
  basis: StockValuationExportBasis,
): string {
  const span = showWarehouse ? 2 : 1;
  return `<tr class="total">
    <td colspan="${span}"><strong>Totals</strong></td>
    <td class="num"><strong>${totals.totalOpeningQty.toLocaleString("en-IN")}</strong></td>
    <td class="num"><strong>${totals.totalInwardQty.toLocaleString("en-IN")}</strong></td>
    <td class="num"><strong>${totals.totalOutwardQty.toLocaleString("en-IN")}</strong></td>
    <td class="num"><strong>${totals.totalClosingQty.toLocaleString("en-IN")}</strong></td>
    <td></td>
    <td class="num"><strong>${valueTotal(totals, basis)}</strong></td>
  </tr>`;
}

function buildFooterNote(meta: StockValuationExportMeta, totals: StockValuationTotals): string {
  const valueLabel =
    meta.exportBasis === "cost"
      ? `Total Cost Value: ₹ ${formatMoneyNumber(totals.totalCostValue)}`
      : !totals.marketValueAvailable || totals.totalMarketValue == null
        ? "Total Market Value: Not Available"
        : `Total Market Value: ₹ ${formatMoneyNumber(totals.totalMarketValue)}`;

  return `<p class="report-footer-note">
    ${escapeHtml(basisLabel(meta.exportBasis))} ·
    Cost Rate Method: ${escapeHtml(getCostRateMethodLabel(meta.costRateMethod))} ·
    Total Closing Quantity: ${totals.totalClosingQty.toLocaleString("en-IN")} ·
    ${escapeHtml(valueLabel)} ·
    ${totals.count} line(s)
  </p>`;
}

function buildReportBodyHtml(
  rows: StockValuationRow[],
  meta: StockValuationExportMeta,
  totals: StockValuationTotals,
): string {
  const detailed = meta.tab === "detailed";
  const tableHtml = buildStandardReportTableHtml({
    columns: detailed
      ? detailedColumns(meta.showWarehouse, meta.exportBasis)
      : summaryColumns(meta.showWarehouse, meta.exportBasis),
    bodyHtml: detailed
      ? buildDetailedRowsHtml(rows, meta.showWarehouse, meta.exportBasis)
      : buildSummaryRowsHtml(rows, meta.showWarehouse, meta.exportBasis),
    footerHtml: detailed
      ? buildDetailedTotalsHtml(totals, meta.showWarehouse, meta.exportBasis)
      : buildSummaryTotalsHtml(totals, meta.showWarehouse, meta.exportBasis),
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
  const tabSuffix = meta.tab === "detailed" ? "Detailed" : "Summary";
  const basisSuffix = meta.exportBasis === "market" ? "Market" : "Cost";
  downloadReportExcelHtml(
    html,
    `Stock_Valuation_${tabSuffix}_${basisSuffix}_${todayExportDateSuffix()}.xls`,
  );
}

export function exportStockValuationToPdf(
  rows: StockValuationRow[],
  meta: StockValuationExportMeta,
  totals: StockValuationTotals,
): void {
  const detailed = meta.tab === "detailed";
  const valueNote =
    meta.exportBasis === "cost"
      ? `Cost Value: ₹ ${formatMoneyNumber(totals.totalCostValue)}`
      : !totals.marketValueAvailable || totals.totalMarketValue == null
        ? "Market Value: Not Available"
        : `Market Value: ₹ ${formatMoneyNumber(totals.totalMarketValue)}`;

  exportTabularReportToPdf({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    columns: detailed
      ? detailedColumns(meta.showWarehouse, meta.exportBasis)
      : summaryColumns(meta.showWarehouse, meta.exportBasis),
    bodyHtml: detailed
      ? buildDetailedRowsHtml(rows, meta.showWarehouse, meta.exportBasis)
      : buildSummaryRowsHtml(rows, meta.showWarehouse, meta.exportBasis),
    footerHtml: detailed
      ? buildDetailedTotalsHtml(totals, meta.showWarehouse, meta.exportBasis)
      : buildSummaryTotalsHtml(totals, meta.showWarehouse, meta.exportBasis),
    footerNote: `${basisLabel(meta.exportBasis)} · Cost Rate Method: ${getCostRateMethodLabel(meta.costRateMethod)} · Closing Qty: ${totals.totalClosingQty.toLocaleString("en-IN")} · ${valueNote} · ${totals.count} line(s)`,
    landscape: true,
  });
}
