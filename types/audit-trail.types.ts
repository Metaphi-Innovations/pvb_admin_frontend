/** Accounts Audit Trail report — mirror backend `/accounts/reports/audit-trail` contract. */

export type AuditTrailExportFormat = "EXCEL" | "PDF";

export type AuditTrailSortField =
  | "performed_at"
  | "entity_number"
  | "entity_type"
  | "action"
  | "performed_by_name"
  | "particular";

export type AuditTrailSortDirection = "asc" | "desc";

export type AuditTrailEntityType =
  | "SALES_INVOICE"
  | "PURCHASE_INVOICE"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "PAYMENT_VOUCHER"
  | "RECEIPT_VOUCHER"
  | "CONTRA_VOUCHER"
  | "JOURNAL_VOUCHER"
  | "LEDGER_OPENING_BALANCE"
  | "STOCK_TRANSFER_ACCOUNTING"
  | "SALES_RETURN_ACCOUNTING";

export type AuditTrailAction =
  | "CREATED"
  | "MODIFIED"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "POSTED"
  | "CANCELLED"
  | "REVERSED"
  | "DELETED";

export interface AuditTrailApiRow {
  id: string;
  event_id: string;
  date_time: string;
  entity_type: AuditTrailEntityType;
  entity_type_label: string;
  entity_id: string;
  entity_number: string | null;
  entity_label: string;
  user_id: string | null;
  user_display: string;
  action: AuditTrailAction;
  action_label: string;
  particular: string;
  before_alteration: string;
  after_alteration: string;
  document_status: string | null;
  accounting_voucher_id: string | null;
  accounting_voucher_number: string | null;
}

export interface AuditTrailScope {
  financial_year_id: string;
  financial_year_code?: string | null;
  financial_year_name?: string | null;
  from_date: string;
  to_date: string;
  company_id: string;
}

export interface AuditTrailAppliedFilters {
  entity_types: AuditTrailEntityType[];
  actions: AuditTrailAction[];
  user_ids: string[];
  search: string | null;
  sort_field: AuditTrailSortField;
  sort_direction: AuditTrailSortDirection;
}

export interface AuditTrailPagination {
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
}

export interface AuditTrailReportResult {
  scope: AuditTrailScope;
  applied_filters: AuditTrailAppliedFilters;
  rows: AuditTrailApiRow[];
  pagination: AuditTrailPagination;
}

export interface AuditTrailFiltersConfig {
  financial_years: Array<{
    financial_year_id: string;
    code: string;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
  }>;
  entity_types: Array<{ value: AuditTrailEntityType; label: string }>;
  actions: Array<{ value: AuditTrailAction; label: string }>;
  users: Array<{
    user_id: string;
    display_name: string;
    username: string | null;
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    page: number;
    page_size: number;
    sort_field: AuditTrailSortField;
    sort_direction: AuditTrailSortDirection;
  };
}

export interface AuditTrailQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  entity_types?: AuditTrailEntityType[];
  actions?: AuditTrailAction[];
  user_ids?: string[];
  search?: string;
  page?: number;
  page_size?: number;
  sort_field?: AuditTrailSortField;
  sort_direction?: AuditTrailSortDirection;
}

export interface AuditTrailExportPayload extends AuditTrailQueryParams {
  format: AuditTrailExportFormat;
}
