export type DayBookBalanceSideFilter = "ALL" | "DEBIT" | "CREDIT";
export type DayBookExportFormat = "EXCEL" | "PDF";
export type DayBookLineScope = "ALL_LINES" | "WAREHOUSE_LINES";
export type DayBookBalanceHealth = "COMPANY" | "WAREHOUSE_NOT_APPLICABLE";

export interface DayBookAmountPair {
  debit: string;
  credit: string;
  difference: string;
  is_balanced: boolean;
}

export interface DayBookScopedAmountPair {
  debit: string;
  credit: string;
  difference: string;
}

export interface DayBookLine {
  accounting_voucher_line_id: string;
  line_number: number | null;
  ledger_id: string;
  ledger_code: string | null;
  ledger_name: string;
  debit: string;
  credit: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  narration: string | null;
  reference_type: string | null;
  reference_id: string | null;
}

export interface DayBookVoucher {
  accounting_voucher_id: string;
  voucher_date: string;
  voucher_type: string;
  voucher_type_label: string;
  voucher_number: string;
  status: string;
  narration: string | null;
  source_type: string | null;
  source_id: string | null;
  source_entity_code: string | null;
  reference_number: string | null;
  party_or_reference: string | null;
  warehouse_id: string | null;
  warehouse_name: string | null;
  total_debit: string;
  total_credit: string;
  difference: string;
  is_balanced: boolean | null;
  line_scope: DayBookLineScope;
  voucher_total: DayBookAmountPair;
  scoped_total: DayBookScopedAmountPair | null;
  is_reversal: boolean;
  reversal_of_voucher_id: string | null;
  view_href: string | null;
  lines: DayBookLine[];
}

export interface DayBookSummary {
  voucher_count: number;
  total_debit: string;
  total_credit: string;
  difference: string;
  is_balanced: boolean | null;
  total_basis: DayBookLineScope;
}

export interface DayBookPageSummary {
  voucher_count: number;
  total_debit: string;
  total_credit: string;
  total_basis: DayBookLineScope;
}

export interface DayBookPagination {
  page: number;
  page_size: number;
  total_vouchers: number;
  total_pages: number;
}

export interface DayBookScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  branch_id: string | null;
  warehouse_id: string | null;
  warehouse_ids: string[];
  warehouse_name: string | null;
  display_total_basis: DayBookLineScope;
  balance_health: DayBookBalanceHealth;
}

export interface DayBookAppliedFilters {
  voucher_types: string[];
  ledger_id: string | null;
  balance_side: DayBookBalanceSideFilter;
  voucher_number: string | null;
  reference: string | null;
}

export interface DayBookReportResponse {
  scope: DayBookScope;
  filters: DayBookAppliedFilters;
  data: DayBookVoucher[];
  summary: DayBookSummary;
  page_summary: DayBookPageSummary;
  pagination: DayBookPagination;
  notes: {
    display_totals: string;
    running_balance: string;
    opening_closing: string;
    balance_health: string;
    reversal: string;
  };
}

export interface DayBookFiltersConfig {
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
  voucher_types: Array<{ value: string; label: string }>;
  balance_sides: Array<{ value: DayBookBalanceSideFilter; label: string }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    balance_side: DayBookBalanceSideFilter;
    page: number;
    page_size: number;
  };
  ledger_lookup_endpoint: string;
}

export interface DayBookQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_ids?: string[];
  branch_ids?: string[];
  voucher_types?: string[];
  ledger_id?: string;
  balance_side?: DayBookBalanceSideFilter;
  voucher_number?: string;
  reference?: string;
  page?: number;
  page_size?: number;
}

export interface DayBookExportPayload extends DayBookQueryParams {
  format: DayBookExportFormat;
}

export interface DayBookMoreFilters {
  ledgerId: string;
  balanceSide: DayBookBalanceSideFilter;
  voucherNumber: string;
  reference: string;
}
