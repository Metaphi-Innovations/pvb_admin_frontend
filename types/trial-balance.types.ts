/** Trial Balance API contracts — mirrors backend TrialBalance DTOs. */

export type TrialBalanceReportType = "NORMAL" | "DETAILED";
export type TrialBalanceBalanceType = "ALL" | "DEBIT" | "CREDIT";
export type TrialBalanceExportFormat = "EXCEL" | "PDF";
export type TrialBalanceNodeType =
  | "PRIMARY_HEAD"
  | "GROUP"
  | "SUB_GROUP"
  | "LEDGER";

export type OpeningBalanceMode =
  | "COMPANY_LEDGER_OPENING_PLUS_LINES"
  | "WAREHOUSE_LINES_ONLY";

export interface DebitCreditPair {
  debit: string;
  credit: string;
}

export interface TrialBalanceHealthSection extends DebitCreditPair {
  difference: string;
  is_balanced: boolean;
}

export interface TrialBalanceHealth {
  opening: TrialBalanceHealthSection;
  period: TrialBalanceHealthSection;
  closing: TrialBalanceHealthSection;
  is_balanced: boolean;
}

export interface TrialBalanceDisplaySummary {
  opening: DebitCreditPair;
  period: DebitCreditPair;
  closing: DebitCreditPair;
}

export interface TrialBalanceScope {
  financial_year_id: string;
  financial_year_code: string | null;
  financial_year_name: string | null;
  from_date: string;
  to_date: string;
  warehouse_id: string | null;
  warehouse_name: string | null;
  opening_balance_mode: OpeningBalanceMode;
}

export interface TrialBalanceFiltersApplied {
  primary_head_id: string | null;
  group_id: string | null;
  sub_group_id: string | null;
  ledger_id: string | null;
  balance_type: TrialBalanceBalanceType;
  include_zero_balance: boolean;
}

export interface TrialBalanceAmountBlock {
  opening: DebitCreditPair;
  period: DebitCreditPair;
  closing: DebitCreditPair;
}

export interface TrialBalanceNormalRow extends TrialBalanceAmountBlock {
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  primary_head_id: string;
  primary_head_code: string;
  primary_head_name: string;
  group_id: string;
  group_code: string;
  group_name: string;
  sub_group_id: string;
  sub_group_code: string;
  sub_group_name: string;
  debit: string;
  credit: string;
}

export interface TrialBalanceHierarchyNode extends TrialBalanceAmountBlock {
  id: string;
  type: TrialBalanceNodeType;
  code: string;
  name: string;
  children: TrialBalanceHierarchyNode[];
}

export interface TrialBalanceReportResult {
  report_type: TrialBalanceReportType;
  scope: TrialBalanceScope;
  filters: TrialBalanceFiltersApplied;
  data: TrialBalanceNormalRow[] | TrialBalanceHierarchyNode[];
  display_summary: TrialBalanceDisplaySummary;
  trial_balance_health: TrialBalanceHealth;
  summary: TrialBalanceHealth;
  notes: {
    opening_balance_branch_limitation: string | null;
  };
}

export interface TrialBalanceFiltersConfig {
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
  balance_types: Array<{ value: TrialBalanceBalanceType; label: string }>;
  report_types: Array<{ value: TrialBalanceReportType; label: string }>;
  defaults: {
    financial_year_id: string | null;
    from_date: string | null;
    to_date: string | null;
    report_type: TrialBalanceReportType;
    balance_type: TrialBalanceBalanceType;
    include_zero_balance: boolean;
  };
  coa_lookup_endpoints: {
    primary_heads: string;
    groups: string;
    sub_groups: string;
    ledgers: string;
  };
}

export interface TrialBalanceQueryParams {
  report_type: TrialBalanceReportType;
  financial_year_id: string;
  from_date: string;
  to_date: string;
  warehouse_id?: string;
  primary_head_id?: string;
  group_id?: string;
  sub_group_id?: string;
  ledger_id?: string;
  balance_type?: TrialBalanceBalanceType;
  include_zero_balance?: boolean;
}

export interface TrialBalanceExportPayload extends TrialBalanceQueryParams {
  format: TrialBalanceExportFormat;
}

/** UI tab ids mapped to backend report_type */
export type TrialBalanceTab = "normal" | "detailed";

export function tabToReportType(tab: TrialBalanceTab): TrialBalanceReportType {
  return tab === "normal" ? "NORMAL" : "DETAILED";
}
