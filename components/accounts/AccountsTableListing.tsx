"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { Pagination } from "@/components/listing/Pagination";

/** Default page size for accounts listings and reports */
export const ACCOUNTS_DEFAULT_PAGE_SIZE = 25;
export const ACCOUNTS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/* ── Compact toolbar: search · filter · columns · export ── */

export interface AccountsTableToolbarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export interface AccountsTableToolbarProps {
  search?: AccountsTableToolbarSearch;
  filters?: React.ReactNode;
  columns?: React.ReactNode;
  onExcel?: () => void;
  onPdf?: () => void;
  exportDisabled?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function AccountsTableToolbar({
  search,
  filters,
  columns,
  onExcel,
  onPdf,
  exportDisabled,
  actions,
  className,
}: AccountsTableToolbarProps) {
  const hasExport = Boolean(onExcel || onPdf);

  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center justify-end gap-1.5 px-2 py-1 border-b border-border/60 bg-white",
        className,
      )}
    >
      {search && (
        <div className="relative w-full max-w-[200px] mr-auto">
          <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            className="h-7 pl-7 pr-2 text-xs rounded-md border-border bg-white"
          />
        </div>
      )}

      {filters}

      {columns}

      {hasExport && (
        <AccountsExportMenu
          onExcel={onExcel}
          onPdf={onPdf}
          disabled={exportDisabled}
        />
      )}

      {actions}
    </div>
  );
}

/* ── Compact pagination footer (bottom-right aligned) ── */

export interface AccountsTablePaginationProps {
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  recordLabel?: string;
}

export function AccountsTablePagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  recordLabel = "records",
}: AccountsTablePaginationProps) {
  return (
    <Pagination
      page={page}
      pageSize={pageSize}
      totalRecords={totalRecords}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      recordLabel={recordLabel}
      variant="compact"
    />
  );
}

/* ── Listing wrapper: summary · toolbar · scroll · footer ── */

export interface AccountsTableListingProps {
  summary?: React.ReactNode;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AccountsTableListing({
  summary,
  toolbar,
  children,
  footer,
  className,
}: AccountsTableListingProps) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)}>
      {summary}
      {toolbar}
      <AccountsTableScroll>{children}</AccountsTableScroll>
      {footer}
    </div>
  );
}

/** Simple inline empty state for accounts tables */
export function AccountsTableEmpty({
  message = "No records found.",
  colSpan,
  onClear,
}: {
  message?: string;
  colSpan: number;
  onClear?: () => void;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="accounts-table-empty">
        {message}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="block mx-auto mt-1 text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        )}
      </td>
    </tr>
  );
}
