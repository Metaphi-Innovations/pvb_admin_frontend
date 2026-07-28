"use client";

/**
 * Standard single-line filter toolbar for Accounting reports.
 * Filters sit left (horizontal scroll on narrow screens); Export / Clear All sit extreme right.
 */

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFilterRow } from "@/components/accounts/ReportFilters";
import { useAccountsColumnFilterContext } from "@/components/accounts/AccountsColumnFilterContext";
import { cn } from "@/lib/utils";

export interface AccountingReportToolbarProps {
  children: React.ReactNode;
  /** Extreme-right export control (typically AccountsExportMenu) */
  exportMenu?: React.ReactNode;
  /** Optional extra actions placed just left of Export (e.g. column menus) */
  endActions?: React.ReactNode;
  /** When true, shows Clear All Filters if the column-filter provider has active filters */
  showClearAllColumnFilters?: boolean;
  /** Explicit Clear All control — overrides the auto provider button when set */
  clearAllFilters?: React.ReactNode;
  className?: string;
}

/** Clear All Filters — only renders when at least one column filter is active. */
export function AccountsClearAllColumnFiltersButton({
  onClear,
  activeCount,
  className,
}: {
  onClear?: () => void;
  activeCount?: number;
  className?: string;
}) {
  const ctx = useAccountsColumnFilterContext();
  const count = activeCount ?? ctx?.activeFilterCount ?? 0;
  const handleClear = onClear ?? ctx?.clearAllColumnFilters;
  if (!handleClear || count <= 0) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs gap-1 px-2.5 shrink-0", className)}
      onClick={handleClear}
    >
      <X className="w-3.5 h-3.5" />
      Clear All Filters
    </Button>
  );
}

/**
 * Compact single-line report filter row.
 * Prefer this (or ReportFilterRow with `end=`) over placing Export in the page title actions.
 */
export function AccountingReportToolbar({
  children,
  exportMenu,
  endActions,
  showClearAllColumnFilters,
  clearAllFilters,
  className,
}: AccountingReportToolbarProps) {
  const clearSlot =
    clearAllFilters ??
    (showClearAllColumnFilters ? <AccountsClearAllColumnFiltersButton /> : null);

  const end =
    clearSlot || endActions || exportMenu ? (
      <>
        {clearSlot}
        {endActions}
        {exportMenu}
      </>
    ) : undefined;

  return (
    <ReportFilterRow end={end} className={className}>
      {children}
    </ReportFilterRow>
  );
}
