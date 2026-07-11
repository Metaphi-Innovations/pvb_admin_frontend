/** Excel-style column filter types — Accounts module only */

export type AccountsColumnFilterType = "text" | "number" | "amount" | "date" | "status" | "select" | "boolean";

export type TextFilterOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "notContains"
  | "blank"
  | "notBlank";

export type NumberFilterOperator =
  | "equals"
  | "gt"
  | "lt"
  | "between"
  | "top10"
  | "blank"
  | "notBlank";

export type DateFilterPreset =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom"
  | "before"
  | "after"
  | "between";

export interface AccountsColumnFilterState {
  type: AccountsColumnFilterType;
  textOperator?: TextFilterOperator;
  textValue?: string;
  selectedValues?: string[];
  numberOperator?: NumberFilterOperator;
  numberValue?: number;
  numberValue2?: number;
  datePreset?: DateFilterPreset;
  dateFrom?: string;
  dateTo?: string;
}

export type AccountsColumnFilters = Record<string, AccountsColumnFilterState | undefined>;

export interface AccountsColumnFilterMeta {
  type: AccountsColumnFilterType;
  /** Static status / dropdown options */
  options?: string[];
  /** Status labels for display */
  optionLabels?: Record<string, string>;
  /** When true, use Excel-style operator controls (legacy). Defaults to provider simpleColumnFilters. */
  advancedFilters?: boolean;
}

export type AccountsColumnFilterConfig = Record<string, AccountsColumnFilterMeta>;
