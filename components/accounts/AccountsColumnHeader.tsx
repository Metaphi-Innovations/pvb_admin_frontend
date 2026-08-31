"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { AccountsTableHeadCell } from "@/components/accounts/AccountsTable";
import { accountsActionColClass } from "@/components/accounts/AccountsTableActions";
import { AccountsColumnFilterPopover } from "./AccountsColumnFilterPopover";
import { useAccountsColumnFilterContext } from "./AccountsColumnFilterContext";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilterType,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import { isColumnFilterActive } from "@/lib/accounts/column-filter-engine";

export interface AccountsColumnHeaderProps {
  label: string;
  colKey: string;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
  onRemoveSort?: () => void;
  filterable?: boolean;
  filterType?: AccountsColumnFilterType;
  filterValue?: AccountsColumnFilterState;
  onFilterChange?: (value: AccountsColumnFilterState | undefined) => void;
  valueOptions?: ColumnValueOption[];
  /** @deprecated Use valueOptions */
  uniqueValues?: string[];
  statusOptions?: string[];
  optionLabels?: Record<string, string>;
  /** Fired when the filter popover opens — use to lazy-load dropdown options. */
  onFilterOpen?: () => void;
  /** Show loading state while server filter options are fetching. */
  optionsLoading?: boolean;
  /** True once the lazy filter query for this column has been enabled. */
  optionsReady?: boolean;
  className?: string;
}

/** Excel-style column header — label + sort + filter in compact ERP layout */
export function AccountsColumnHeader({
  label,
  colKey,
  align = "left",
  sortable: sortableProp = true,
  sortKey: sortKeyProp,
  sortDir: sortDirProp = "asc",
  onSort: onSortProp,
  onRemoveSort: onRemoveSortProp,
  filterable: filterableProp = true,
  filterType: filterTypeProp = "text",
  filterValue: filterValueProp,
  onFilterChange: onFilterChangeProp,
  valueOptions: valueOptionsProp,
  uniqueValues: uniqueValuesProp,
  statusOptions: statusOptionsProp,
  optionLabels: optionLabelsProp,
  onFilterOpen,
  optionsLoading = false,
  optionsReady = false,
  className,
}: AccountsColumnHeaderProps) {
  const ctx = useAccountsColumnFilterContext();
  const fromCtx =
    ctx && colKey !== "_actions"
      ? ctx.headerProps(colKey, label, {
          filterType: filterTypeProp,
          align,
          sortable: sortableProp,
          filterable: filterableProp,
          statusOptions: statusOptionsProp?.length ? statusOptionsProp : undefined,
        })
      : null;

  const sortable = fromCtx?.sortable ?? sortableProp;
  const sortKey = sortKeyProp ?? fromCtx?.sortKey ?? "";
  const sortDir = sortDirProp ?? fromCtx?.sortDir ?? "asc";
  const onSort = onSortProp ?? fromCtx?.onSort;
  const onRemoveSort = onRemoveSortProp ?? fromCtx?.onRemoveSort;
  const filterable = (fromCtx?.filterable ?? filterableProp) && Boolean(onFilterChangeProp ?? fromCtx?.onFilterChange);
  const filterType = filterTypeProp;
  const filterValue = filterValueProp ?? fromCtx?.filterValue;
  const onFilterChange = onFilterChangeProp ?? fromCtx?.onFilterChange;
  const valueOptions =
    valueOptionsProp && valueOptionsProp.length > 0
      ? valueOptionsProp
      : (fromCtx?.valueOptions ?? valueOptionsProp ?? []);
  const statusOptions = statusOptionsProp ?? fromCtx?.statusOptions ?? [];
  const optionLabels = optionLabelsProp ?? fromCtx?.optionLabels ?? {};

  const sorted = sortable && sortKey === colKey;
  const filtered = isColumnFilterActive(filterValue);
  const hasActionColClass =
    typeof className === "string" &&
    (className.includes("accounts-col-actions-wide") ||
      className.includes("accounts-col-actions-cta") ||
      /\baccounts-col-actions\b/.test(className));

  const handleSortClick = () => {
    if (!sortable || !onSort) return;
    onSort(colKey);
  };

  return (
    <AccountsTableHeadCell
      align={align}
      sorted={sorted || filtered}
      uppercase
      className={cn(
        sortable && "select-none",
        colKey === "_actions" && !hasActionColClass && accountsActionColClass("multi"),
        className,
      )}
    >
      <div
        className={cn(
          "inline-flex items-center gap-0.5 max-w-full",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
        title={label}
      >
        <button
          type="button"
          onClick={handleSortClick}
          className={cn(
            "inline-flex items-center gap-0.5 whitespace-nowrap text-left",
            sortable && "cursor-pointer hover:text-brand-700",
            align === "right" && "text-right",
          )}
          title={sortable ? "Click: A→Z · again: Z→A · again: default order" : undefined}
        >
          <span className="truncate min-w-0">{label}</span>
          {sortable && (
            <span className="flex-shrink-0 text-muted-foreground/70">
              {sorted ? (
                <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
              ) : (
                <ChevronsUpDown className="w-3 h-3 opacity-40" />
              )}
            </span>
          )}
        </button>
        {filterable && onFilterChange && (
          <span className="flex-shrink-0">
            <AccountsColumnFilterPopover
              label={label}
              filterType={filterType}
              value={filterValue}
              onChange={onFilterChange}
              valueOptions={valueOptions}
              uniqueValues={uniqueValuesProp}
              statusOptions={statusOptions}
              optionLabels={optionLabels}
              onOpen={onFilterOpen}
              optionsLoading={optionsLoading}
              optionsReady={optionsReady}
            />
          </span>
        )}
      </div>
    </AccountsTableHeadCell>
  );
}
