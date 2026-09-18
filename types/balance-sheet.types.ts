/** Balance Sheet API types — matches the backend report contract. */

export type BalanceSheetReportType = "NORMAL" | "DETAILED";
export type BalanceSheetExportFormat = "EXCEL" | "PDF";
export type BalanceSheetNodeType =
  | "GROUP"
  | "SUB_GROUP"
  | "LEDGER"
  | "REPORTING_ROW";
export type BalanceSheetSide = "ASSETS" | "LIABILITIES" | "EQUITY";
export type BalanceSheetBalanceSide = "DEBIT" | "CREDIT";
export type BalanceSheetOpeningMode =
  | "COMPANY_LEDGER_OPENING_PLUS_LINES"
  | "WAREHOUSE_LINES_ONLY";

export interface BalanceSheetWarning {
  code: string;
  message: string;
  severity?: "INFO" | "WARNING" | "ERROR";
}

export interface BalanceSheetNode {
  id: string;
  node_type: BalanceSheetNodeType;
  name: string;
  code: string | null;
  side: BalanceSheetSide;
  debit: string;
  credit: string;
  balance_amount: string;
  balance_side: BalanceSheetBalanceSide;
  signed_balance: string;
  is_abnormal: boolean;
  ledger_id: string | null;
  ledger_code: string | null;
  ledger_name: string | null;
  group_id: string | null;
  sub_group_id: string | null;
  primary_head_id: string | null;
  primary_head_code: string | null;
  children?: BalanceSheetNode[];
}

export interface BalanceSheetSection {
  rows: BalanceSheetNode[];
  subtotal: string;
  signed_subtotal: string;
}

export interface BalanceSheetEquitySection extends BalanceSheetSection {
  current_profit: string;
  current_loss: string;
}

export interface BalanceSheetTotals {
  liabilities_and_equity: string;
  assets: string;
  difference: string;
  is_balanced: boolean;
}

export interface BalanceSheetScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  as_on_date: string;
  movement_from_date: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  company_name: string;
  opening_balance_mode: BalanceSheetOpeningMode;
  generated_at: string;
}

export interface BalanceSheetFiltersApplied {
  group_id: string | null;
  sub_group_id: string | null;
  ledger_id: string | null;
  show_zero: boolean;
  filters_are_display_only: true;
}

export interface BalanceSheetReportResult {
  report_type: BalanceSheetReportType;
  scope: BalanceSheetScope;
  filters: BalanceSheetFiltersApplied;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetEquitySection;
  liabilities_and_equity: BalanceSheetSection;
  assets: BalanceSheetSection;
  totals: BalanceSheetTotals;
  reconciliation: {
    profit_and_loss: {
      type: "PROFIT" | "LOSS" | "NONE";
      amount: string;
      applied_to_equity: boolean;
      source: string;
    };
  };
  health: {
    is_balanced: boolean;
    difference: string;
    unposted_voucher_count: number | null;
    suspense_row_created: false;
  };
  warnings: BalanceSheetWarning[];
  notes: {
    opening_balance_branch_limitation: string | null;
    equity_structure: string;
    current_profit_treatment: string;
  };
}

export interface BalanceSheetFiltersConfig {
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
  report_types: Array<{ value: BalanceSheetReportType; label: string }>;
  defaults: {
    financial_year_id: string | null;
    as_on_date: string | null;
    report_type: BalanceSheetReportType;
    show_zero: boolean;
  };
  scope_filters: string[];
  display_filters: string[];
  notes: string[];
}

export interface BalanceSheetQueryParams {
  report_type: BalanceSheetReportType;
  financial_year_id: string;
  as_on_date: string;
  warehouse_id?: string;
  group_id?: string;
  sub_group_id?: string;
  ledger_id?: string;
  show_zero: boolean;
}

export interface BalanceSheetExportPayload extends BalanceSheetQueryParams {
  format: BalanceSheetExportFormat;
}
