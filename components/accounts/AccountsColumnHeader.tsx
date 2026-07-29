"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronsUpDown } from "lucide-react";
import { AccountsTableHeadCell } from "@/components/accounts/AccountsTable";
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
  const filterable = filterableProp && Boolean(onFilterChangeProp ?? fromCtx?.onFilterChange);
  const filterType = filterTypeProp;
  const filterValue = filterValueProp ?? fromCtx?.filterValue;
  const onFilterChange = onFilterChangeProp ?? fromCtx?.onFilterChange;
  const valueOptions = valueOptionsProp ?? fromCtx?.valueOptions ?? [];
  const statusOptions = statusOptionsProp ?? fromCtx?.statusOptions ?? [];
  const optionLabels = optionLabelsProp ?? fromCtx?.optionLabels ?? {};

  const sorted = sortable && sortKey === colKey;
  const filtered = isColumnFilterActive(filterValue);

  const handleSortClick = (e: React.MouseEvent) => {
    if (!sortable || !onSort) return;
    if (e.detail === 2 && onRemoveSort) {
      onRemoveSort();
      return;
    }
    onSort(colKey);
  };

  return (
    <AccountsTableHeadCell
      align={align}
      sorted={sorted || filtered}
      uppercase
      className={cn(sortable && "select-none", className)}
    >
      <div
        className={cn(
          "inline-flex items-center gap-0.5 max-w-full",
          align === "right" && "justify-end",
          align === "center" && "justify-center",
        )}
      >
        <button
          type="button"
          onClick={handleSortClick}
          className={cn(
            "inline-flex items-center gap-0.5 min-w-0 text-left",
            sortable && "cursor-pointer hover:text-brand-700",
            align === "right" && "text-right flex-row-reverse",
          )}
          title={sortable ? "Click to sort · Double-click to remove sort" : undefined}
        >
          <span className="truncate">{label}</span>
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
          <AccountsColumnFilterPopover
            label={label}
            filterType={filterType}
            value={filterValue}
            onChange={onFilterChange}
            valueOptions={valueOptions}
            uniqueValues={uniqueValuesProp}
            statusOptions={statusOptions}
            optionLabels={optionLabels}
          />
        )}
      </div>
    </AccountsTableHeadCell>
  );
}
