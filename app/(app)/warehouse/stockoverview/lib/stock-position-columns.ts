import { formatMoney } from "@/lib/accounts/money-format";
import type { StockDateMode, StockPositionLine } from "../types/stock-position";

/** Column headers — must match StockPositionTable thead labels exactly. */
export function getStockPositionTableHeaders(dateMode: StockDateMode): string[] {
  const inLabel = dateMode === "single" ? "Day In" : "Period In";
  const outLabel = dateMode === "single" ? "Day Out" : "Period Out";
  return [
    "Product Code",
    "Product Name",
    "HSN",
    "Scientific Name",
    "Category",
    "Pack Size",
    "Opening Qty",
    inLabel,
    outLabel,
    "Closing Qty",
    "Available",
    "Batch No.",
    "Expiry",
    "Warehouse",
    "CP",
    "Valuation",
    "Status",
  ];
}

function fmtQty(n: number): string {
  return n.toLocaleString("en-IN");
}

function fmtMovementQty(n: number): string {
  return n > 0 ? fmtQty(n) : "—";
}

/** Cell values formatted the same way as the on-screen table. */
export function stockPositionLineToExportRow(
  row: StockPositionLine,
): (string | number)[] {
  return [
    row.productCode,
    row.productName,
    row.hsn,
    row.scientificName,
    row.category,
    row.packSize,
    fmtQty(row.openingQty),
    fmtMovementQty(row.dayIn),
    fmtMovementQty(row.dayOut),
    fmtQty(row.closingQty),
    fmtQty(row.availableQty),
    row.batchNumber,
    row.expiryDate,
    row.warehouse,
    fmtQty(row.cp),
    formatMoney(row.stockValuation),
    row.status,
  ];
}

export function filterStockPositionLinesForSearch(
  lines: StockPositionLine[],
  search: string,
): StockPositionLine[] {
  const q = search.trim().toLowerCase();
  if (!q) return lines;
  return lines.filter(
    (l) =>
      l.productCode.toLowerCase().includes(q) ||
      l.productName.toLowerCase().includes(q) ||
      l.batchNumber.toLowerCase().includes(q) ||
      l.warehouse.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q),
  );
}
