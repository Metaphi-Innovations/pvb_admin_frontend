/** Sales Register report types — mirror backend `/accounts/reports/sales-register` contract. */

export type SalesRegisterReportStatus = "POSTED" | "CANCELLED";
export type SalesRegisterInvoiceType =
  | "SALES"
  | "DIRECT_SERVICE"
  | "STOCK_TRANSFER";
export type SalesRegisterGstType = "CGST_SGST" | "IGST";
export type SalesRegisterGstTypeFilter = "ALL" | SalesRegisterGstType;
export type SalesRegisterExportFormat = "EXCEL" | "PDF";
export type SalesRegisterSortBy =
  | "invoice_date"
  | "invoice_number"
  | "invoice_total"
  | "taxable_amount"
  | "customer_name";
export type SalesRegisterSortOrder = "asc" | "desc";

export interface SalesRegisterApiRow {
  id: string;
  invoice_date: string;
  invoice_no: string;
  customer: {
    id: string | null;
    code: string | null;
    name: string;
    gstin: string | null;
  };
  state: {
    code: string | null;
    name: string | null;
  };
  salesperson: {
    id: string | null;
    name: string | null;
  };
  branch: {
    id: string;
    name: string;
  };
  warehouse: {
    id: string;
    name: string;
  };
  taxable_value: string;
  cgst: string;
  sgst: string;
  igst: string;
  gst_amount: string;
  discount: string;
  other_charges: string;
  invoice_total: string;
  payment_terms: string | null;
  invoice_status: SalesRegisterReportStatus;
  gst_type: SalesRegisterGstType;
  invoice_type: SalesRegisterInvoiceType;
  posted_voucher_id: string | null;
  posted_voucher_no: string | null;
  customer_ledger_id: string | null;
}

export interface SalesRegisterSummary {
  invoice_count: number;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  discount: string;
  other_charges: string;
  invoice_value: string;
}

export interface SalesRegisterPageSummary {
  invoice_count: number;
  taxable_amount: string;
  cgst: string;
  sgst: string;
  igst: string;
  discount: string;
  other_charges: string;
  invoice_value: string;
}

export interface SalesRegisterPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface SalesRegisterScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  company_name: string;
  branch_ids: string[];
  warehouse_ids: string[];
}

export interface SalesRegisterAppliedFilters {
  customer_ids: string[];
  customer_type_id: string | null;
  salesperson_ids: string[];
  invoice_number: string | null;
  state_code: string | null;
  statuses: SalesRegisterReportStatus[];
  invoice_types: SalesRegisterInvoiceType[];
  gst_type: SalesRegisterGstTypeFilter;
  sort_by: SalesRegisterSortBy;
  sort_order: SalesRegisterSortOrder;
}

export interface SalesRegisterReportResult {
  scope: SalesRegisterScope;
  applied_filters: SalesRegisterAppliedFilters;
  rows: SalesRegisterApiRow[];
  summary: SalesRegisterSummary;
  page_summary: SalesRegisterPageSummary;
  pagination: SalesRegisterPagination;
  health: { warnings: string[] };
  notes: Record<string, string>;
}

export interface SalesRegisterFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  branches: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
  warehouses: Array<{
    warehouse_id: string;
    warehouse_name: string;
    status: string;
  }>;
  customers: Array<{
    customer_id: string;
    customer_code: string;
    customer_name: string;
  }>;
  /** Uncapped master dropdown — preferred over embedded `customers`. */
  customer_lookup_endpoint?: string;
  customer_types: Array<{
    customer_type_id: string;
    customer_type_name: string;
    customer_initial_code: string;
  }>;
  salespeople: Array<{
    user_id: string;
    name: string;
  }>;
  states: Array<{
    state_id: string;
    state_code: string;
    state_name: string;
  }>;
  statuses: Array<{ value: SalesRegisterReportStatus; label: string }>;
  invoice_types: Array<{ value: SalesRegisterInvoiceType; label: string }>;
  gst_types: Array<{ value: SalesRegisterGstTypeFilter; label: string }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    statuses: SalesRegisterReportStatus[];
    invoice_types: SalesRegisterInvoiceType[];
    gst_type: SalesRegisterGstTypeFilter;
    page: number;
    page_size: number;
    sort_by: SalesRegisterSortBy;
    sort_order: SalesRegisterSortOrder;
  };
}

export interface SalesRegisterQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  branch_ids?: string[];
  warehouse_ids?: string[];
  customer_ids?: string[];
  customer_type_id?: string;
  salesperson_ids?: string[];
  invoice_number?: string;
  state_code?: string;
  statuses?: SalesRegisterReportStatus[];
  invoice_types?: SalesRegisterInvoiceType[];
  gst_type?: SalesRegisterGstTypeFilter;
  page?: number;
  page_size?: number;
  sort_by?: SalesRegisterSortBy;
  sort_order?: SalesRegisterSortOrder;
}

export interface SalesRegisterExportPayload extends SalesRegisterQueryParams {
  format: SalesRegisterExportFormat;
}
