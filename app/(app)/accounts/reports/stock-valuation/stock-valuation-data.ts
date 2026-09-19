/**
 * Stock Valuation report — display helpers + legacy export type re-exports.
 * Live page uses SIH APIs via StockValuationApiService.
 */

export {
  formatQtyWithUnit,
  formatStockValuationDate,
  getCostRateMethodLabel,
  type CostRateMethod,
  type StockValuationRow,
  type StockValuationTab,
  type StockValuationTotals,
} from "@/lib/accounts/stock-valuation-compute";

/** Legacy client-export row shape (server export is preferred). */
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
