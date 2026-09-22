/** Stock Valuation report types — mirror backend `/accounts/reports/stock-valuation`. */

export type StockValuationExportFormat = "EXCEL" | "PDF";
export type StockValuationExportView = "summary" | "accounting_details";
export type StockValuationExportBasis = "cost" | "market";
export type StockValuationSortOrder = "asc" | "desc";
export type StockValuationTab = "summary" | "detailed";

export type StockValuationFilterField =
  | "product_name"
  | "warehouse_name"
  | "voucher_number";

export interface StockValuationColumnFilters {
  product_name?: string[];
  warehouse_name?: string[];
  voucher_number?: string[];
}

export interface StockValuationQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_ids?: string[];
  product_ids?: string[];
  page?: number;
  page_size?: number;
  /** PO-style: `field` ASC, `-field` DESC; omit for default order. */
  ordering?: string;
  column_filters?: StockValuationColumnFilters;
}

export interface StockValuationExportPayload extends StockValuationQueryParams {
  format: StockValuationExportFormat;
  view: StockValuationExportView;
  /** Summary export: cost columns only or market columns only. */
  basis?: StockValuationExportBasis;
}

export interface StockValuationScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  as_on_date: string;
  company_name: string;
  warehouse_ids: string[];
}

export interface StockValuationAppliedFilters {
  product_ids: string[];
  ordering: string;
}

export interface StockValuationPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface StockValuationSummaryApiRow {
  id: string;
  product_id: string;
  product_code: string | null;
  product_name: string;
  uom: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  closing_qty: string;
  cost_rate: string | null;
  cost_value: string;
  market_rate: string | null;
  market_value: string | null;
  final_value: string;
  cost_rate_missing: boolean;
}

export interface StockValuationSummaryTotals {
  product_count: number;
  total_closing_qty: string;
  total_cost_value: string;
  total_market_value: string | null;
  market_value_available: boolean;
  total_final_value: string;
}

export interface StockValuationSummaryResult {
  scope: StockValuationScope;
  applied_filters: StockValuationAppliedFilters;
  summary: StockValuationSummaryTotals;
  pagination: StockValuationPagination;
  rows: StockValuationSummaryApiRow[];
  notes: {
    source: string;
    as_on: string;
    market: string;
  };
}

export interface StockValuationDetailApiRow {
  id: string;
  voucher_date: string;
  voucher_number: string;
  voucher_type: string;
  source_module: string | null;
  source_entity_code: string | null;
  product_id: string;
  product_code: string | null;
  product_name: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  debit_qty: string;
  credit_qty: string;
  debit_amount: string;
  credit_amount: string;
  unit_rate: string | null;
  net_amount: string;
}

export interface StockValuationDetailsTotals {
  line_count: number;
  total_debit_qty: string;
  total_credit_qty: string;
  total_debit_amount: string;
  total_credit_amount: string;
  total_net_amount: string;
}

export interface StockValuationDetailsResult {
  scope: StockValuationScope;
  applied_filters: StockValuationAppliedFilters;
  summary: StockValuationDetailsTotals;
  pagination: StockValuationPagination;
  rows: StockValuationDetailApiRow[];
  notes: {
    source: string;
    period: string;
  };
}

export interface StockValuationFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string | null;
    name: string | null;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
  products: Array<{
    product_id: string;
    product_code: string;
    product_name: string;
    uom: string | null;
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    page: number;
    page_size: number;
    ordering: string;
  };
}

export interface StockValuationSaveMarketRatePayload {
  product_id: string;
  warehouse_id: string | null;
  as_on_date: string;
  /** null clears the saved rate */
  market_rate: number | null;
}

export interface StockValuationSaveMarketRateResult {
  product_id: string;
  warehouse_id: string | null;
  as_on_date: string;
  market_rate: string | null;
  cleared: boolean;
}
