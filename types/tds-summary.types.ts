/** TDS Summary report types — mirror backend `/accounts/reports/tds-summary` contract. */

export type TdsSummaryNature = "TDS_RECEIVABLE" | "TDS_PAYABLE";
export type TdsSummaryNatureFilter = "ALL" | TdsSummaryNature;
export type TdsSummaryApplicationMode = "AGAINST_INVOICE" | "ON_ACCOUNT";
export type TdsSummaryApplicationModeFilter = "ALL" | TdsSummaryApplicationMode;
export type TdsSummaryExportFormat = "EXCEL" | "PDF";
export type TdsSummaryInvoiceType = "SalesInvoice" | "PurchaseInvoice" | null;
export type TdsSummaryPartyKind = "CUSTOMER" | "SUPPLIER" | "LEDGER" | null;
export type TdsSummaryPartySource = "snapshot" | "live_master" | "ledger";
export type TdsSummarySortBy =
  | "voucher_date"
  | "party_name"
  | "invoice_date"
  | "invoice_number"
  | "taxable_amount"
  | "tds_amount"
  | "tds_rate"
  | "tds_section";
export type TdsSummarySortOrder = "asc" | "desc";

export interface TdsSummaryApiRow {
  id: string;
  accounting_voucher_id: string;
  accounting_tax_detail_id: string;
  month_key: string;
  month_label: string;
  party_id: string | null;
  party_ledger_id: string | null;
  party_name: string;
  pan: string | null;
  party_kind: TdsSummaryPartyKind;
  party_source: TdsSummaryPartySource;
  invoice_id: string | null;
  invoice_type: TdsSummaryInvoiceType;
  invoice_date: string | null;
  invoice_number: string | null;
  /** UI Amount column = TDS taxable/base amount. */
  taxable_amount: string;
  tds_amount: string;
  tds_rate: string;
  tds_section_id: string | null;
  tds_section_code: string | null;
  tds_section_name: string | null;
  tds_nature: TdsSummaryNature;
  financial_year_id: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  voucher_date: string;
  voucher_number: string;
  application_mode: TdsSummaryApplicationMode | null;
}

export interface TdsSummarySummary {
  entry_count: number;
  taxable_amount: string;
  tds_amount: string;
}

export interface TdsSummaryPageSummary {
  entry_count: number;
  taxable_amount: string;
  tds_amount: string;
}

export interface TdsSummaryPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface TdsSummaryScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  company_name: string;
  branch_ids: string[];
  warehouse_ids: string[];
}

export interface TdsSummaryAppliedFilters {
  month: string | null;
  tds_section_ids: string[];
  party_ids: string[];
  party_ledger_ids: string[];
  tds_nature: TdsSummaryNatureFilter;
  application_mode: TdsSummaryApplicationModeFilter;
  search: string | null;
  sort_by: TdsSummarySortBy;
  sort_order: TdsSummarySortOrder;
}

export interface TdsSummaryReportResult {
  scope: TdsSummaryScope;
  applied_filters: TdsSummaryAppliedFilters;
  rows: TdsSummaryApiRow[];
  summary: TdsSummarySummary;
  page_summary: TdsSummaryPageSummary;
  pagination: TdsSummaryPagination;
  health: { warnings: string[] };
  notes: Record<string, string>;
}

export interface TdsSummaryFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  months: Array<{ value: string; label: string }>;
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
  tds_sections: Array<{
    tds_section_id: string;
    tds_code: string;
    tds_section_name: string | null;
    tds_rate: string;
  }>;
  parties: [];
  party_lookup_endpoints: {
    customers: string;
    suppliers: string;
  };
  tds_natures: Array<{ value: TdsSummaryNatureFilter; label: string }>;
  application_modes: Array<{
    value: TdsSummaryApplicationModeFilter;
    label: string;
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    month: null;
    tds_nature: TdsSummaryNatureFilter;
    application_mode: TdsSummaryApplicationModeFilter;
    page: number;
    page_size: number;
    sort_by: TdsSummarySortBy;
    sort_order: TdsSummarySortOrder;
  };
}

export interface TdsSummaryQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  month?: string;
  branch_ids?: string[];
  warehouse_ids?: string[];
  tds_section_ids?: string[];
  party_ids?: string[];
  party_ledger_ids?: string[];
  tds_nature?: TdsSummaryNatureFilter;
  application_mode?: TdsSummaryApplicationModeFilter;
  search?: string;
  page?: number;
  page_size?: number;
  sort_by?: TdsSummarySortBy;
  sort_order?: TdsSummarySortOrder;
}

export interface TdsSummaryExportPayload extends TdsSummaryQueryParams {
  format: TdsSummaryExportFormat;
}
