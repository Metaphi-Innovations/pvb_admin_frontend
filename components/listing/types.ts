import React from "react";

export type FilterType = "text" | "dropdown" | "date" | "audit";

export interface ColumnConfig<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: { label: string; value: string }[]; // For dropdown filters
  sticky?: boolean; // e.g. for actions
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: any, row: T, index: number) => React.ReactNode;
}

export interface DateRange {
  fromDate: string;
  toDate: string;
}

/** Created/Updated column filter: user and/or date range (combinable). */
export interface AuditFilterValue {
  user?: string;
  fromDate?: string;
  toDate?: string;
}

export type FilterValue = string | string[] | DateRange | AuditFilterValue;

export interface FilterState {
  [key: string]: FilterValue;
}

export interface SortState {
  key: string;
  direction: "asc" | "desc" | "none";
}

export interface ActionItemConfig<T = any> {
  label: string;
  action: string;
  icon?: React.ComponentType<any>;
  onClick?: (row: T) => void;
  variant?: "default" | "destructive";
  disabled?: (row: T) => boolean;
  hide?: (row: T) => boolean;
}

export interface MasterListingProps<T = any> {
  columns: ColumnConfig<T>[];
  data: T[];
  loading?: boolean;
  totalRecords: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSortChange: (sort: SortState) => void;
  onFilterChange: (filters: FilterState) => void;
  actions?: ActionItemConfig<T>[];
  rowKey?: (row: T) => string;
  emptyMessage?: string;
  onAdd?: () => void;
  addLabel?: string;
  onExport?: () => void;
  searchPlaceholder?: string;
  hideSearch?: boolean;
  // State from parent to keep track of current filters/sorting if controlled
  currentFilters?: FilterState;
  currentSort?: SortState;
}
