"use client";

/**
 * Shared accounts listing layout primitives — title/filter/tabs/table structure
 * for all `/accounts/**` listing and report pages.
 */

import React from "react";
import { cn } from "@/lib/utils";

/** White filter card — sits between page title and table card */
export const ACCOUNTS_LISTING_FILTER_CARD_CLASS = "accounts-listing-filter-card";

/** Table container — tabs + scrollable table + footer */
export const ACCOUNTS_LISTING_TABLE_CARD_CLASS =
  "accounts-listing-table-card overflow-hidden flex flex-col flex-1 min-h-0 bg-white border border-[#E5E7EB] rounded-xl shadow-sm";

/** Compact tabs row below filters, above table */
export const ACCOUNTS_LISTING_TABS_ROW_CLASS =
  "accounts-listing-tabs-row flex-shrink-0 px-3 bg-white border-b border-border/60";

export interface AccountsListingFilterCardProps {
  children: React.ReactNode;
  /** Right-aligned actions (Export, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

export function AccountsListingFilterCard({
  children,
  actions,
  className,
}: AccountsListingFilterCardProps) {
  return (
    <div className={cn(ACCOUNTS_LISTING_FILTER_CARD_CLASS, className)}>
      {children}
      {actions ? (
        <div className="ml-auto flex items-end gap-1.5 flex-shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

export function AccountsListingTabsRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ACCOUNTS_LISTING_TABS_ROW_CLASS, className)}>{children}</div>;
}

export function AccountsListingTableCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ACCOUNTS_LISTING_TABLE_CARD_CLASS, className)}>{children}</div>;
}
