/**
 * Stock valuation report data — uses warehouse QC-passed stock × Pricing Master CP.
 */

export {
  computeStockValuationRows as computeStockValuation,
  stockValuationSummary,
  computeWarehouseValuationSummary,
  type StockValuationRow,
  type StockValuationFilters,
  type WarehouseValuationSummary,
} from "./inventory-accounting-data";

/** @deprecated Use computeStockValuationRows with filters */
export interface LegacyStockValuationRow {
  item: string;
  sku: string;
  warehouse: string;
  category: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  rate: number;
  stockValue: number;
  valuationMethod: string;
}
