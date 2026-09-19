/**
 * Stock Valuation report — re-exports from compute layer (movement-based valuation).
 */

export {
  buildStockLedgerDrillHref,
  buildStockValuationRows,
  computeStockValuationTotals,
  consolidateStockValuationProductWise,
  COST_RATE_METHOD_OPTIONS,
  filterStockValuationRows,
  formatOptionalMoney,
  formatQtyWithUnit,
  formatStockValuationDate,
  getCostRateMethodLabel,
  getStockValuationCategoryOptions,
  getStockValuationProductOptions,
  getValuationBasisLabel,
  getValuationPeriodStart,
  getValuationRateFromPricing,
  NEGATIVE_STOCK_PERMITTED,
  sortStockValuationRows,
  VALUATION_BASIS_OPTIONS,
  type CostRateMethod,
  type StockValuationFilters,
  type StockValuationGrouping,
  type StockValuationRow,
  type StockValuationSortKey,
  type StockValuationStatus,
  type StockValuationStatusFilter,
  type StockValuationTab,
  type StockValuationTotals,
  type ValuationBasis,
} from "@/lib/accounts/stock-valuation-compute";

/** UI placeholder row for Accounting Details tab (until STOCK_IN_HAND voucher API). */
export interface AccountingDetailRow {
  id: string;
  date: string;
  voucherType: string;
  voucherNumber: string;
  productName: string;
  productCode: string;
  warehouse: string;
  debitQty: number;
  creditQty: number;
  debitValue: number;
  creditValue: number;
  netValue: number;
}
