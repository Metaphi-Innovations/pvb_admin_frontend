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
  filterable = true,
  filterType = "text",
  filterValue: filterValueProp,
  onFilterChange: onFilterChangeProp,
  valueOptions: valueOptionsProp,
  statusOptions: statusOptionsProp,
  onRemoveSort: onRemoveSortProp,
  className,
}: {
  label: string;
  colKey: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (k: string) => void;
  align?: "left" | "right" | "center";
  filterable?: boolean;
  filterType?: AccountsColumnHeaderProps["filterType"];
  filterValue?: AccountsColumnHeaderProps["filterValue"];
  onFilterChange?: AccountsColumnHeaderProps["onFilterChange"];
  valueOptions?: AccountsColumnHeaderProps["valueOptions"];
  statusOptions?: string[];
  onRemoveSort?: () => void;
  className?: string;
}) {
  const ctx = useAccountsColumnFilterContext();
  const fromCtx = ctx?.headerProps(colKey, label, { filterType, align, filterable });

  return (
    <AccountsColumnHeader
      label={label}
      colKey={colKey}
      align={align}
      sortable={fromCtx?.sortable ?? Boolean(onSortProp)}
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
  compact,
}: {
  tabs: { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
  counts?: Record<string, number>;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-0 border-b border-border/60 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "font-medium whitespace-nowrap border-b-2 -mb-px leading-none",
            compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
            active === t.id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-600 hover:text-slate-800",
          )}
        >
          {t.label}
          {counts != null && counts[t.id] != null ? (
            <span
              className={cn(
                "ml-1.5 tabular-nums font-semibold",
                compact
                  ? "text-[10px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground"
                  : "opacity-70 text-[11px]",
              )}
            >
              ({counts[t.id]})
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
