"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { AccountsTableScroll } from "@/components/accounts/AccountsTable";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { ReportSearchFilter } from "@/components/accounts/ReportFilters";
import {
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsListingTabsRow,
} from "@/components/accounts/AccountsListingHeader";
import { Pagination } from "@/components/listing/Pagination";

export {
  AccountsListingFilterCard,
  AccountsListingTableCard,
  AccountsListingTabsRow,
} from "@/components/accounts/AccountsListingHeader";

/** Default page size for accounts listings and reports */
export const ACCOUNTS_DEFAULT_PAGE_SIZE = 25;
export const ACCOUNTS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

/* ── COA-style listing toolbar row ── */

export interface AccountsListingToolbarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onExcel?: () => void;
  onPdf?: () => void;
  onCsv?: () => void;
  exportDisabled?: boolean;
  className?: string;
}

/** Compact filter row — rendered as a standalone filter card above the table */
export function AccountsListingToolbar({
  children,
  actions,
  onExcel,
  onPdf,
  onCsv,
  exportDisabled,
  className,
}: AccountsListingToolbarProps) {
  const hasExport = Boolean(onExcel || onPdf || onCsv);

  return (
    <AccountsListingFilterCard
      className={className}
      actions={
        (actions || hasExport) ? (
          <>
            {actions}
            {hasExport && (
              <AccountsExportMenu
                onExcel={onExcel}
                onPdf={onPdf}
                onCsv={onCsv}
                disabled={exportDisabled}
              />
            )}
          </>
        ) : undefined
      }
    >
      {children}
    </AccountsListingFilterCard>
  );
}

/* ── Toolbar: search · filter · export ── */

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
  onCsv?: () => void;
  exportDisabled?: boolean;
  actions?: React.ReactNode;
  className?: string;
  /** @deprecated All toolbars render as filter card with COA layout */
  placement?: "page-header" | "in-card";
}

export function AccountsTableToolbar({
  search,
  filters,
  columns,
  onExcel,
  onPdf,
  onCsv,
  exportDisabled,
  actions,
  className,
}: AccountsTableToolbarProps) {
  return (
    <AccountsListingToolbar
      onExcel={onExcel}
      onPdf={onPdf}
      onCsv={onCsv}
      exportDisabled={exportDisabled}
      actions={actions}
      className={className}
    >
      {filters}
      {search && (
        <ReportSearchFilter
          value={search.value}
          onChange={search.onChange}
          placeholder={search.placeholder ?? "Search…"}
          className="min-w-[180px] flex-1 max-w-sm"
        />
      )}
      {columns}
    </AccountsListingToolbar>
  );
}

/* ── Simple count footer (COA-style) ── */

export function AccountsListingCountFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 px-4 py-2 border-t border-border bg-muted/20",
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">{children}</p>
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

/* ── Table card: filter card · tabs · scroll · footer ── */

export interface AccountsTableListingProps {
  summary?: React.ReactNode;
  toolbar?: React.ReactNode;
  /** Secondary row below filters (e.g. status tabs) */
  subheader?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AccountsTableListing({
  summary,
  toolbar,
  subheader,
  children,
  footer,
  className,
}: AccountsTableListingProps) {
  return (
    <div className={cn("accounts-listing-card", className)}>
      {toolbar}
      <AccountsListingTableCard>
        {subheader ? <AccountsListingTabsRow>{subheader}</AccountsListingTabsRow> : null}
        {summary}
        <AccountsTableScroll>{children}</AccountsTableScroll>
        {footer}
      </AccountsListingTableCard>
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
