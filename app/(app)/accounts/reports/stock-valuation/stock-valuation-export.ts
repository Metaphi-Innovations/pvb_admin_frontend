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
  formatStockValuationDate,
  getCostRateMethodLabel,
  type CostRateMethod,
  type StockValuationRow,
  type StockValuationTab,
  type StockValuationTotals,
  type AccountingDetailRow,
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

function tabLabel(tab: StockValuationTab): string {
  return tab === "detailed" ? "Accounting Details" : "Summary";
}

function buildHeaderOptions(meta: StockValuationExportMeta): ReportHeaderOptions {
  const view = tabLabel(meta.tab);
  return {
    reportTitle: `${REPORT_NAME} — ${view}`,
    financialYear: meta.financialYear,
    reportPeriod: `As on ${meta.asOnDate}`,
    subtitle: `${basisLabel(meta.exportBasis)} · Accounting valuation as on date`,
    filters: [
      { label: "Warehouse", value: meta.warehouse },
      { label: "Product", value: meta.product },
      { label: "View", value: view },
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
      { label: "Final Stock Value (₹)", align: "right", className: "num" },
    );
  } else {
    cols.push(
      { label: "Market Rate (₹)", align: "right", className: "num" },
      { label: "Market Value (₹)", align: "right", className: "num" },
      { label: "Final Stock Value (₹)", align: "right", className: "num" },
    );
  }
  return cols;
}

const ACCOUNTING_DETAIL_COLUMNS: ReportColumnHeader[] = [
  { label: "Date" },
  { label: "Voucher Type" },
  { label: "Voucher Number" },
  { label: "Product Name" },
  { label: "Warehouse" },
  { label: "Debit Quantity", align: "right", className: "num" },
  { label: "Credit Quantity", align: "right", className: "num" },
  { label: "Debit Value (₹)", align: "right", className: "num" },
  { label: "Credit Value (₹)", align: "right", className: "num" },
  { label: "Net Value (₹)", align: "right", className: "num" },
];

function rateValueCells(row: StockValuationRow, basis: StockValuationExportBasis): string {
  if (basis === "cost") {
    return `<td class="num">${row.costRateMissing ? "—" : formatExportAmount(row.costRate)}</td>
      <td class="num">${row.costRateMissing && row.closingQty !== 0 ? "—" : formatExportAmount(row.costValue)}</td>
      <td class="num">${formatExportAmount(row.finalStockValue)}</td>`;
  }
  return `<td class="num">${formatExportOptional(row.marketRate, row.marketRateMissing)}</td>
    <td class="num">${formatExportOptional(row.marketValue, row.marketRateMissing)}</td>
    <td class="num">${formatExportAmount(row.finalStockValue)}</td>`;
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

function buildAccountingDetailRowsHtml(rows: AccountingDetailRow[]): string {
  return rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(formatStockValuationDate(row.date))}</td>
        <td>${escapeHtml(row.voucherType)}</td>
        <td class="mono">${escapeHtml(row.voucherNumber)}</td>
        <td>${escapeHtml(row.productName)}</td>
        <td>${escapeHtml(row.warehouse)}</td>
        <td class="num">${row.debitQty > 0 ? row.debitQty.toLocaleString("en-IN") : "—"}</td>
        <td class="num">${row.creditQty > 0 ? row.creditQty.toLocaleString("en-IN") : "—"}</td>
        <td class="num">${row.debitValue > 0 ? formatExportAmount(row.debitValue) : "—"}</td>
        <td class="num">${row.creditValue > 0 ? formatExportAmount(row.creditValue) : "—"}</td>
        <td class="num">${formatExportAmount(row.netValue)}</td>
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
    <td class="num"><strong>${formatExportAmount(totals.totalFinalStockValue)}</strong></td>
  </tr>`;
}

function buildAccountingDetailTotalsHtml(rows: AccountingDetailRow[]): string {
  const debitQty = rows.reduce((s, r) => s + r.debitQty, 0);
  const creditQty = rows.reduce((s, r) => s + r.creditQty, 0);
  const debitValue = rows.reduce((s, r) => s + r.debitValue, 0);
  const creditValue = rows.reduce((s, r) => s + r.creditValue, 0);
  const netValue = rows.reduce((s, r) => s + r.netValue, 0);
  return `<tr class="total">
    <td colspan="5"><strong>Totals (${rows.length} entries)</strong></td>
    <td class="num"><strong>${debitQty.toLocaleString("en-IN")}</strong></td>
    <td class="num"><strong>${creditQty.toLocaleString("en-IN")}</strong></td>
    <td class="num"><strong>${formatExportAmount(debitValue)}</strong></td>
    <td class="num"><strong>${formatExportAmount(creditValue)}</strong></td>
    <td class="num"><strong>${formatExportAmount(netValue)}</strong></td>
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
    As on ${escapeHtml(meta.asOnDate)} ·
    Total Closing Quantity: ${totals.totalClosingQty.toLocaleString("en-IN")} ·
    ${escapeHtml(valueLabel)} ·
    Final Stock Value: ₹ ${formatMoneyNumber(totals.totalFinalStockValue)} ·
    ${totals.count} line(s)
  </p>`;
}

function buildReportBodyHtml(
  rows: StockValuationRow[],
  meta: StockValuationExportMeta,
  totals: StockValuationTotals,
  accountingRows?: AccountingDetailRow[],
): string {
  if (meta.tab === "detailed" && accountingRows) {
    const tableHtml = buildStandardReportTableHtml({
      columns: ACCOUNTING_DETAIL_COLUMNS,
      bodyHtml: buildAccountingDetailRowsHtml(accountingRows),
      footerHtml: buildAccountingDetailTotalsHtml(accountingRows),
    });
    return tableHtml + buildFooterNote(meta, totals);
  }

  const tableHtml = buildStandardReportTableHtml({
    columns: summaryColumns(meta.showWarehouse, meta.exportBasis),
    bodyHtml: buildSummaryRowsHtml(rows, meta.showWarehouse, meta.exportBasis),
    footerHtml: buildSummaryTotalsHtml(totals, meta.showWarehouse, meta.exportBasis),
  });
  return tableHtml + buildFooterNote(meta, totals);
}

export async function exportStockValuationToExcel(
  rows: StockValuationRow[],
  meta: StockValuationExportMeta,
  totals: StockValuationTotals,
  accountingRows?: AccountingDetailRow[],
): Promise<void> {
  const html = buildReportExcelDocumentHtml({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    bodyHtml: buildReportBodyHtml(rows, meta, totals, accountingRows),
    landscape: true,
  });
  const tabSuffix = meta.tab === "detailed" ? "Accounting_Details" : "Summary";
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
  accountingRows?: AccountingDetailRow[],
): void {
  const valueNote =
    meta.exportBasis === "cost"
      ? `Cost Value: ₹ ${formatMoneyNumber(totals.totalCostValue)}`
      : !totals.marketValueAvailable || totals.totalMarketValue == null
        ? "Market Value: Not Available"
        : `Market Value: ₹ ${formatMoneyNumber(totals.totalMarketValue)}`;

  if (meta.tab === "detailed" && accountingRows) {
    exportTabularReportToPdf({
      title: REPORT_NAME,
      header: buildHeaderOptions(meta),
      columns: ACCOUNTING_DETAIL_COLUMNS,
      bodyHtml: buildAccountingDetailRowsHtml(accountingRows),
      footerHtml: buildAccountingDetailTotalsHtml(accountingRows),
      footerNote: `Accounting Details · As on ${meta.asOnDate} · ${accountingRows.length} entr${accountingRows.length === 1 ? "y" : "ies"} · ${valueNote}`,
      landscape: true,
    });
    return;
  }

  exportTabularReportToPdf({
    title: REPORT_NAME,
    header: buildHeaderOptions(meta),
    columns: summaryColumns(meta.showWarehouse, meta.exportBasis),
    bodyHtml: buildSummaryRowsHtml(rows, meta.showWarehouse, meta.exportBasis),
    footerHtml: buildSummaryTotalsHtml(totals, meta.showWarehouse, meta.exportBasis),
    footerNote: `${basisLabel(meta.exportBasis)} · As on ${meta.asOnDate} · Closing Qty: ${totals.totalClosingQty.toLocaleString("en-IN")} · ${valueNote} · ${totals.count} line(s)`,
    landscape: true,
  });
}
