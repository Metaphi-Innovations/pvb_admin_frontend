export type GeneralLedgerMode = "LEDGER" | "GROUP";
export type GeneralLedgerBalanceSide = "DEBIT" | "CREDIT";
export type GeneralLedgerBalanceSideFilter = "ALL" | "DEBIT" | "CREDIT";
export type GeneralLedgerRowKind = "OPENING" | "TRANSACTION" | "CLOSING";
export type GeneralLedgerExportFormat = "EXCEL" | "PDF";
export type GeneralLedgerNodeType = "GROUP" | "LEDGER";
export type GeneralLedgerSpecialView = "NONE" | "STOCK_IN_HAND" | "COGS";
export type OpeningBalanceMode =
  | "COMPANY_LEDGER_OPENING_PLUS_LINES"
  | "WAREHOUSE_LINES_ONLY";

export type GeneralLedgerLedgerType =
  | "Customer"
  | "Vendor"
  | "Bank"
  | "Cash"
  | "Sales"
  | "Purchase"
  | "GST"
  | "Expense"
  | "Income"
  | "Inventory"
  | "Employee"
  | "General";

export interface GeneralLedgerAmountSide {
  amount: string;
  side: GeneralLedgerBalanceSide;
}

export interface GeneralLedgerDebitCredit {
  debit: string;
  credit: string;
}

export interface GeneralLedgerCompany {
  name: string | null;
  address: string | null;
  contact: string | null;
  email: string | null;
}

export interface GeneralLedgerScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  warehouse_id: string | null;
  warehouse_ids: string[];
  warehouse_name: string | null;
  opening_balance_mode: OpeningBalanceMode;
}

export interface GeneralLedgerApiRow {
  kind: GeneralLedgerRowKind;
  date: string;
  particulars: string;
  narration: string | null;
  transaction_type: string | null;
  voucher_type: string | null;
  voucher_number: string | null;
  voucher_id: string | null;
  debit: string;
  credit: string;
  running_balance: string;
  running_balance_side: GeneralLedgerBalanceSide;
  reference_no: string | null;
  bank_date: string | null;
  recon_status: string | null;
  view_href: string | null;
}

export interface GeneralLedgerSummary {
  opening: GeneralLedgerAmountSide;
  period: GeneralLedgerDebitCredit;
  filtered_period: GeneralLedgerDebitCredit;
  closing: GeneralLedgerAmountSide;
  grand_total: GeneralLedgerDebitCredit;
  has_period_transactions: boolean;
}

export interface GeneralLedgerPagination {
  page: number;
  page_size: number;
  total_transactions: number;
  total_pages: number;
}

export interface GeneralLedgerHeader {
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  ledger_type: GeneralLedgerLedgerType;
  parent_group: string;
  gstin: string | null;
  pan: string | null;
  bill_wise_outstanding: boolean;
  special_view: GeneralLedgerSpecialView;
}

export interface GeneralLedgerStatementResponse {
  mode: "LEDGER";
  scope: GeneralLedgerScope;
  company: GeneralLedgerCompany;
  ledger: GeneralLedgerHeader;
  summary: GeneralLedgerSummary;
  opening_row: GeneralLedgerApiRow;
  transactions: GeneralLedgerApiRow[];
  closing_row: GeneralLedgerApiRow;
  pagination: GeneralLedgerPagination;
  notes: {
    opening_balance_branch_limitation: string | null;
  };
}

export interface GeneralLedgerGroupChild {
  id: string;
  code: string;
  name: string;
  node_type: GeneralLedgerNodeType;
  debit: string;
  credit: string;
  closing_debit: string;
  closing_credit: string;
}

export interface GeneralLedgerGroupResponse {
  mode: "GROUP";
  scope: GeneralLedgerScope;
  company: GeneralLedgerCompany;
  group: {
    group_id: string;
    group_name: string;
    parent_group: string;
    node_type: GeneralLedgerNodeType;
  };
  children: GeneralLedgerGroupChild[];
  notes: {
    opening_balance_branch_limitation: string | null;
  };
}

export type GeneralLedgerReportResponse =
  | GeneralLedgerStatementResponse
  | GeneralLedgerGroupResponse;

export interface GeneralLedgerFiltersConfig {
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
  ledger_types: Array<{ value: GeneralLedgerLedgerType; label: string }>;
  balance_sides: Array<{ value: GeneralLedgerBalanceSideFilter; label: string }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    balance_side: GeneralLedgerBalanceSideFilter;
    page: number;
    page_size: number;
  };
  ledger_lookup_endpoint: string;
}

export interface GeneralLedgerQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  ledger_id?: string;
  group_id?: string;
  warehouse_ids?: string[];
  branch_ids?: string[];
  voucher_types?: string[];
  balance_side?: GeneralLedgerBalanceSideFilter;
  page?: number;
  page_size?: number;
}

export interface GeneralLedgerExportPayload extends GeneralLedgerQueryParams {
  format: GeneralLedgerExportFormat;
  ledger_code?: string;
}
