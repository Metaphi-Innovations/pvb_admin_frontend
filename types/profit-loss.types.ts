/** Profit & Loss API types — matches the backend contract. */

export type ProfitLossReportType = "NORMAL" | "DETAILED";
export type ProfitLossTab = "normal" | "detailed";
export type ProfitLossSide = "DEBIT" | "CREDIT";
export type ProfitLossNature = "DEBIT" | "CREDIT" | "NONE";
export type ProfitLossResultType = "PROFIT" | "LOSS" | "NONE";
export type ProfitLossExportFormat = "EXCEL" | "PDF";

export type ProfitLossRowKind =
  | "CATEGORY"
  | "GROUP"
  | "SUB_GROUP"
  | "LEDGER"
  | "REPORTING"
  | "PRESENTATION"
  | "SECTION_TOTAL";

export interface ProfitLossRow {
  id: string;
  code: string | null;
  particular: string;
  row_kind: ProfitLossRowKind;
  amount: string;
  signed_amount: string;
  side: ProfitLossSide;
  nature: ProfitLossNature;
  ledger_id: string | null;
  ledger_code: string | null;
  ledger_name: string | null;
  /** Explicit account-group UUID. Never parsed from `id`. */
  group_id: string | null;
  /** Explicit account-subgroup UUID. Never parsed from `id`. */
  sub_group_id: string | null;
  is_presentation: boolean;
  children?: ProfitLossRow[];
}

export interface ProfitLossResult {
  type: ProfitLossResultType;
  amount: string;
}

export interface ProfitLossTradingAccount {
  debit: ProfitLossRow[];
  credit: ProfitLossRow[];
  debit_total: string;
  credit_total: string;
  is_balanced: boolean;
  gross_result: ProfitLossResult;
}

export interface ProfitLossFinalAccount {
  debit: ProfitLossRow[];
  credit: ProfitLossRow[];
  debit_total: string;
  credit_total: string;
  is_balanced: boolean;
  net_result: ProfitLossResult;
}

export interface ProfitLossSummary {
  opening_stock: string;
  net_purchases: string;
  net_sales: string;
  direct_income: string;
  direct_expenses_excluding_cogs: string;
  closing_stock: string;
  gross_profit: string;
  gross_loss: string;
  indirect_income: string;
  indirect_expenses: string;
  net_profit: string;
  net_loss: string;
  cogs_excluded: string;
}

export interface ProfitLossWarning {
  code: string;
  message: string;
}

export interface ProfitLossHealth {
  stock_balance_abnormal: boolean;
  branch_stock_available: boolean;
  internal_transfer_excluded: boolean;
  product_stock_breakdown_available: boolean;
  cogs_excluded_from_trading: true;
  internal_transfer_branch_policy:
    | "EXCLUDED_CONSOLIDATED"
    | "OPEN_EXCLUDED_BY_DEFAULT";
  warnings: ProfitLossWarning[];
}

export interface ProfitLossScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  company_name: string;
  opening_stock_mode:
    | "COMPANY_LEDGER_OPENING_PLUS_LINES"
    | "WAREHOUSE_LINES_ONLY";
}

export interface ProfitLossReportResult {
  report_type: ProfitLossReportType;
  scope: ProfitLossScope;
  filters: {
    group_id: string | null;
    sub_group_id: string | null;
    ledger_id: string | null;
    show_zero: boolean;
    filters_are_display_only: true;
  };
  summary: ProfitLossSummary;
  trading_account: ProfitLossTradingAccount;
  profit_and_loss_account: ProfitLossFinalAccount;
  health: ProfitLossHealth;
  reconciliation: {
    cogs_period_net: string;
    note: string;
  };
  filtered_hierarchy: {
    affects_net_profit: false;
    trading_account: ProfitLossTradingAccount;
    profit_and_loss_account: ProfitLossFinalAccount;
  } | null;
}

export interface ProfitLossFiltersConfig {
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
  report_types: Array<{ value: ProfitLossReportType; label: string }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    report_type: ProfitLossReportType;
    show_zero: boolean;
  };
  scope_filters: string[];
  display_filters: string[];
}

export interface ProfitLossQueryParams {
  report_type: ProfitLossReportType;
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_id?: string;
  group_id?: string;
  sub_group_id?: string;
  ledger_id?: string;
  show_zero: boolean;
}

export interface ProfitLossExportPayload extends ProfitLossQueryParams {
  format: ProfitLossExportFormat;
}

export function tabToReportType(tab: ProfitLossTab): ProfitLossReportType {
  return tab === "detailed" ? "DETAILED" : "NORMAL";
}
