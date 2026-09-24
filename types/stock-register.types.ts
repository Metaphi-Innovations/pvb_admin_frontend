/** Stock Register report types — mirror backend `/accounts/reports/stock-register`. */

export type StockRegisterExportFormat = "EXCEL" | "PDF";
export type StockRegisterExportView =
  | "summary"
  | "detailed"
  | "batch_wise"
  | "rejected"
  | "rejected_detailed";
export type StockRegisterSortOrder = "asc" | "desc";
export type StockRegisterTab = "summary" | "detailed" | "batch-wise";
/** Row-level stock bucket tag (Sellable vs Rejected shown together in each tab). */
export type StockRegisterStockType = "sellable" | "rejected";

export type StockRegisterFilterField =
  | "product_name"
  | "warehouse_name"
  | "document_no"
  | "batch_no"
  | "stock_type";

export interface StockRegisterColumnFilters {
  product_name?: string[];
  warehouse_name?: string[];
  document_no?: string[];
  batch_no?: string[];
  stock_type?: string[];
}

export interface StockRegisterQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_ids?: string[];
  product_ids?: string[];
  page?: number;
  page_size?: number;
  /** PO-style: `field` ASC, `-field` DESC; omit for default order. */
  ordering?: string;
  column_filters?: StockRegisterColumnFilters;
  /** Merge sellable + rejected into one paged listing. */
  include_rejected?: boolean;
}

export interface StockRegisterExportPayload extends StockRegisterQueryParams {
  format: StockRegisterExportFormat;
  view: StockRegisterExportView;
}

export interface StockRegisterScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  company_name: string;
  warehouse_ids: string[];
}

export interface StockRegisterAppliedFilters {
  product_ids: string[];
  ordering: string;
  column_filters?: StockRegisterColumnFilters;
}

export interface StockRegisterPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface StockRegisterSummaryApiRow {
  id: string;
  stock_type: StockRegisterStockType;
  product_id: string;
  product_code: string | null;
  product_name: string;
  uom: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  opening_qty: string;
  inward_qty: string;
  outward_qty: string;
  closing_qty: string;
}

export interface StockRegisterSummaryTotals {
  product_count: number;
  total_opening_qty: string;
  total_inward_qty: string;
  total_outward_qty: string;
  total_closing_qty: string;
}

export interface StockRegisterRejectedSummaryTotals {
  product_count: number;
  total_opening_qty: string;
  total_rejected_in_qty: string;
  total_rejected_out_qty: string;
  total_closing_qty: string;
}

export interface StockRegisterSummaryResult {
  scope: StockRegisterScope;
  applied_filters: StockRegisterAppliedFilters;
  summary: StockRegisterSummaryTotals;
  rejected_summary: StockRegisterRejectedSummaryTotals | null;
  pagination: StockRegisterPagination;
  rows: StockRegisterSummaryApiRow[];
  notes: {
    source: string;
    opening: string;
    sellable: string;
    rejected?: string;
    limitation?: string;
  };
}

export interface StockRegisterDetailedApiRow {
  id: string;
  stock_type: StockRegisterStockType;
  movement_date: string;
  voucher_type: string;
  voucher_number: string;
  source_module: string;
  product_id: string;
  product_code: string | null;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string | null;
  party_name: string | null;
  batch_no: string | null;
  reject_reason: string | null;
  quantity_in: string;
  quantity_out: string;
  running_balance: string;
}

export interface StockRegisterDetailedTotals {
  transaction_count: number;
  total_quantity_in: string;
  total_quantity_out: string;
  net_movement: string;
}

export interface StockRegisterDetailedResult {
  scope: StockRegisterScope;
  applied_filters: StockRegisterAppliedFilters;
  summary: StockRegisterDetailedTotals;
  rejected_summary: StockRegisterDetailedTotals | null;
  pagination: StockRegisterPagination;
  rows: StockRegisterDetailedApiRow[];
  notes: {
    source: string;
    period: string;
    rejected?: string;
    limitation?: string;
  };
}

export interface StockRegisterBatchApiRow {
  id: string;
  stock_type: StockRegisterStockType;
  product_id: string;
  product_code: string | null;
  product_name: string;
  uom: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  batch_no: string;
  manufacture_date: string | null;
  expiry_date: string | null;
  opening_qty: string;
  inward_qty: string;
  outward_qty: string;
  closing_qty: string;
}

export interface StockRegisterBatchTotals {
  product_count: number;
  batch_count: number;
  total_opening_qty: string;
  total_inward_qty: string;
  total_outward_qty: string;
  total_closing_qty: string;
}

export interface StockRegisterBatchResult {
  scope: StockRegisterScope;
  applied_filters: StockRegisterAppliedFilters;
  summary: StockRegisterBatchTotals;
  rejected_summary: StockRegisterRejectedSummaryTotals | null;
  pagination: StockRegisterPagination;
  rows: StockRegisterBatchApiRow[];
  notes: {
    source: string;
    batch: string;
    rejected?: string;
    limitation?: string;
  };
}

export interface StockRegisterRejectedSummaryApiRow {
  id: string;
  product_id: string;
  product_code: string | null;
  product_name: string;
  uom: string | null;
  warehouse_id: string;
  warehouse_name: string | null;
  opening_qty: string;
  rejected_in_qty: string;
  rejected_out_qty: string;
  closing_qty: string;
}

export interface StockRegisterRejectedSummaryResult {
  scope: StockRegisterScope;
  applied_filters: StockRegisterAppliedFilters;
  summary: StockRegisterRejectedSummaryTotals;
  pagination: StockRegisterPagination;
  rows: StockRegisterRejectedSummaryApiRow[];
  notes: {
    source: string;
    rejected: string;
    limitation: string;
  };
}

export interface StockRegisterRejectedDetailedApiRow {
  id: string;
  movement_date: string;
  voucher_type: string;
  voucher_number: string;
  source_module: string;
  product_id: string;
  product_code: string | null;
  product_name: string;
  warehouse_id: string;
  warehouse_name: string | null;
  batch_no: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  reject_reason: string | null;
  reject_type: string | null;
  quantity_in: string;
  quantity_out: string;
  running_balance: string;
}

export interface StockRegisterRejectedDetailedTotals {
  transaction_count: number;
  total_quantity_in: string;
  total_quantity_out: string;
  net_movement: string;
}

export interface StockRegisterRejectedDetailedResult {
  scope: StockRegisterScope;
  applied_filters: StockRegisterAppliedFilters;
  summary: StockRegisterRejectedDetailedTotals;
  pagination: StockRegisterPagination;
  rows: StockRegisterRejectedDetailedApiRow[];
  notes: {
    source: string;
    rejected: string;
    limitation: string;
  };
}

export interface StockRegisterFiltersConfig {
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
    status: string | null;
  }>;
  products: Array<{
    product_id: string;
    product_code: string | null;
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
