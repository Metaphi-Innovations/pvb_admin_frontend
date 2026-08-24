"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge as SharedStatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import {
  AccountsColumnHeader,
  type AccountsColumnHeaderProps,
} from "@/components/accounts/AccountsColumnHeader";
import { useAccountsColumnFilterContext } from "@/components/accounts/AccountsColumnFilterContext";

export { AccountsColumnHeader } from "@/components/accounts/AccountsColumnHeader";
export { AccountsColumnFilterPopover } from "@/components/accounts/AccountsColumnFilterPopover";
export { ExcelColumnFilter, ExcelColumnHeader } from "@/components/accounts/ExcelColumnFilter";
export {
  AccountingReportToolbar,
  AccountsClearAllColumnFiltersButton,
} from "@/components/accounts/AccountingReportToolbar";
export { useAccountsColumnFilters } from "@/components/accounts/useAccountsColumnFilters";
export {
  AccountsColumnFilterProvider,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/components/accounts/AccountsColumnFilterContext";

export function SortTh({
  label,
  colKey,
  sortKey: sortKeyProp,
  sortDir: sortDirProp,
  onSort: onSortProp,
  align = "left",
  sortable = true,
  filterable = true,
  filterType = "text",
  filterValue: filterValueProp,
  onFilterChange: onFilterChangeProp,
  valueOptions: valueOptionsProp,
  statusOptions: statusOptionsProp,
  onRemoveSort: onRemoveSortProp,
  onFilterOpen,
  optionsLoading,
  optionsReady,
  className,
}: {
  label: string;
  colKey: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (k: string) => void;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  filterable?: boolean;
  filterType?: AccountsColumnHeaderProps["filterType"];
  filterValue?: AccountsColumnHeaderProps["filterValue"];
  onFilterChange?: AccountsColumnHeaderProps["onFilterChange"];
  valueOptions?: AccountsColumnHeaderProps["valueOptions"];
  statusOptions?: string[];
  onRemoveSort?: () => void;
  onFilterOpen?: () => void;
  optionsLoading?: boolean;
  optionsReady?: boolean;
  className?: string;
}) {
  const ctx = useAccountsColumnFilterContext();
  const fromCtx = ctx?.headerProps(colKey, label, { filterType, align, filterable, sortable });

  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable={fromCtx?.sortable ?? sortable}
      sortKey={sortKeyProp ?? fromCtx?.sortKey ?? ""}
      sortDir={sortDirProp ?? fromCtx?.sortDir ?? "asc"}
      onSort={onSortProp ?? fromCtx?.onSort}
      onRemoveSort={onRemoveSortProp ?? fromCtx?.onRemoveSort}
      filterable={filterable && Boolean(onFilterChangeProp ?? fromCtx?.onFilterChange)}
      filterType={filterType}
      filterValue={filterValueProp ?? fromCtx?.filterValue}
      onFilterChange={onFilterChangeProp ?? fromCtx?.onFilterChange}
      valueOptions={valueOptionsProp ?? fromCtx?.valueOptions}
      statusOptions={statusOptionsProp ?? fromCtx?.statusOptions}
      optionLabels={fromCtx?.optionLabels}
      onFilterOpen={onFilterOpen}
      optionsLoading={optionsLoading}
      optionsReady={optionsReady}
      className={className}
    />
  );
}

const STATUS_MAP: Record<string, StatusKey> = {
  active: "active",
  inactive: "inactive",
  approved: "approved",
  posted: "approved",
  completed: "approved",
  draft: "draft",
  rejected: "rejected",
  sent: "approved",
  cancelled: "rejected",
  paid: "approved",
  unpaid: "pending",
  partially_paid: "partial",
  no_debit: "draft",
  partially_debited: "partial",
  fully_debited: "closed",
  open: "pending",
  partial: "partial",
  closed: "closed",
  matched: "approved",
  unmatched: "pending",
  reconciled: "draft",
  pending: "pending",
  unallocated: "pending",
  partially_allocated: "partial",
  fully_allocated: "approved",
  follow_up_due: "partial",
  promise_to_pay: "pending",
  partially_collected: "partial",
  collected: "closed",
  not_contacted: "pending",
  follow_up_scheduled: "partial",
  part_payment_received: "partial",
  escalated: "rejected",
  overdue: "rejected",
};

export function StatusBadge({ status }: { status: string }) {
  const key = STATUS_MAP[status] ?? "inactive";
  const label = status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return <SharedStatusBadge status={key} label={label} size="sm" />;
}

export function SectionTabs({
  tabs,
  active,
  onChange,
  counts,
  /** Defaults to compact (COA density). Pass `false` only for rare oversized tab rows. */
  compact = true,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  counts?: Record<string, number>;
  compact?: boolean;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex max-w-full items-center overflow-x-auto",
        "rounded-lg border border-border bg-muted/40",
        compact ? "gap-0.5 p-0.5" : "gap-1 p-1.5 rounded-xl",
      )}
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-md transition-all",
              compact ? "px-2.5 py-1 text-xs" : "px-5 py-2.5 text-sm rounded-lg",
              isActive
                ? "bg-white font-semibold text-brand-600 shadow-sm"
                : "font-medium text-slate-600 hover:bg-white/70 hover:text-foreground",
            )}
          >
            {t.label}
            {counts != null && counts[t.id] != null ? (
              <span
                className={cn(
                  "ml-1.5 tabular-nums font-semibold text-[10px] text-muted-foreground",
                  isActive && "text-brand-600/80",
                )}
              >
                ({counts[t.id]})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
