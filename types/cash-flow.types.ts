/** Cash Flow API types — matches the backend contract. */

export type CashFlowActivity = "OPERATING" | "INVESTING" | "FINANCING";
export type CashFlowDirection = "INFLOW" | "OUTFLOW";
export type CashFlowActivityFilter =
  | "ALL"
  | "OPERATING"
  | "INVESTING"
  | "FINANCING";
export type CashFlowExportFormat = "EXCEL" | "PDF";
export type OpeningBalanceMode =
  | "COMPANY_LEDGER_OPENING_PLUS_LINES"
  | "WAREHOUSE_LINES_ONLY";

export type CashFlowLineCode =
  | "CASH_RECEIVED_FROM_CUSTOMERS"
  | "CASH_PAID_TO_SUPPLIERS"
  | "CASH_PAID_TO_EMPLOYEES"
  | "GST_PAID"
  | "INTEREST_PAID"
  | "INCOME_TAX_PAID"
  | "OTHER_OPERATING_RECEIPTS"
  | "OTHER_OPERATING_PAYMENTS"
  | "PURCHASE_OF_FIXED_ASSETS"
  | "SALE_OF_FIXED_ASSETS"
  | "INVESTMENT_PURCHASE"
  | "INVESTMENT_SALE"
  | "CAPITAL_INTRODUCED"
  | "LOAN_RECEIVED"
  | "LOAN_REPAID"
  | "DIVIDEND_PAID"
  | "OTHER_INVESTING_CASH_FLOWS"
  | "OTHER_FINANCING_CASH_FLOWS"
  | "UNCLASSIFIED_CASH_FLOW";

export interface CashFlowRow {
  code: CashFlowLineCode | string;
  label: string;
  amount: string;
  direction: CashFlowDirection;
  activity: CashFlowActivity;
}

export interface CashFlowActivitySection {
  rows: CashFlowRow[];
  inflow: string;
  outflow: string;
  net: string;
}

export interface CashFlowScope {
  company_name: string;
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  opening_balance_mode: OpeningBalanceMode;
  generated_at: string;
  cash_bank_ledger_ids: string[];
}

export interface CashFlowSummary {
  opening_cash_bank: string;
  net_operating: string;
  net_investing: string;
  net_financing: string;
  net_increase_decrease: string;
  calculated_closing_cash_bank: string;
  actual_closing_cash_bank: string;
  reconciliation_difference: string;
  is_reconciled: boolean;
}

export interface CashFlowWarning {
  code: string;
  message: string;
}

export interface CashFlowUnclassifiedSample {
  accounting_voucher_id: string;
  voucher_number: string;
  voucher_type: string;
  voucher_date: string;
  amount: string;
  counterpart_ledger_id: string | null;
  counterpart_ledger_code: string | null;
  counterpart_ledger_name: string | null;
  counterpart_sub_group_code: string | null;
}

export interface CashFlowHealth {
  unclassified_count: number;
  unclassified_amount: string;
  excluded_internal_transfer_amount: string;
  excluded_branch_transfer_amount: string;
  overdraft_ledger_count: number;
  warnings: CashFlowWarning[];
  unclassified_samples: CashFlowUnclassifiedSample[];
}

export interface CashFlowReportResult {
  scope: CashFlowScope;
  filters: {
    activity_type: CashFlowActivityFilter;
    cash_bank_ledger_id: string | null;
  };
  operating_activities: CashFlowActivitySection;
  investing_activities: CashFlowActivitySection;
  financing_activities: CashFlowActivitySection;
  summary: CashFlowSummary;
  health: CashFlowHealth;
  notes: {
    opening_balance_branch_limitation: string | null;
    interest_classification_policy: string;
    method: "DIRECT";
  };
}

export interface CashFlowFiltersConfig {
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
  activity_types: Array<{ value: CashFlowActivityFilter; label: string }>;
  cash_bank_ledgers: Array<{
    ledger_id: string;
    ledger_code: string;
    ledger_name: string;
    kind: "CASH" | "BANK";
    sub_group_code: string;
  }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    activity_type: CashFlowActivityFilter;
  };
}

export interface CashFlowQueryParams {
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_id?: string;
  activity_type?: CashFlowActivityFilter;
  cash_bank_ledger_id?: string;
}

export interface CashFlowExportPayload extends CashFlowQueryParams {
  format: CashFlowExportFormat;
}
