"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { Pagination } from "@/components/listing/Pagination";

/** Default page size for accounts listings and reports */
export const ACCOUNTS_DEFAULT_PAGE_SIZE = 25;
export const ACCOUNTS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/* ── Toolbar: search · filter · export (top-right on listing pages) ── */

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
  /** page-header = standalone row above table card; in-card = inside table card header */
  placement?: "page-header" | "in-card";
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
  placement = "in-card",
}: AccountsTableToolbarProps) {
  const hasExport = Boolean(onExcel || onPdf);
  const isPageHeader = placement === "page-header";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        isPageHeader ? "justify-end" : "justify-end px-5 py-2.5 border-b border-border/60 bg-white",
        className,
      )}
    >
      {search && (
        <div className={cn("relative", isPageHeader ? "w-full max-w-[220px] sm:w-[220px]" : "w-full max-w-[220px]")}>
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? "Search…"}
            className="h-8 pl-8 pr-3 text-xs rounded-lg border-border bg-white"
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

/* ── Pagination footer ── */

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
      variant="full"
    />
  );
}

/* ── Table card: toolbar · scroll · footer ── */

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
    <div className={cn("accounts-listing-card", className)}>
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
