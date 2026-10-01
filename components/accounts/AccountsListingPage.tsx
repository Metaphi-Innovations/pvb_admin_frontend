"use client";

import React from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTableListing,
  type AccountsTableListingProps,
} from "@/components/accounts/AccountsTableListing";
import { ReportFilterRow } from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

export interface AccountsListingPageProps {
  section: string;
  title: string;
  description?: string;
  hideDescription?: boolean;
  actions?: React.ReactNode;
  summary?: React.ReactNode;
  filters: React.ReactNode;
  exportSlot?: React.ReactNode;
  subheader?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  layout?: "standard" | "split" | "form";
  className?: string;
}

/** Canonical Accounts listing shell — header, filter row, table card, footer. */
export function AccountsListingPage({
  section,
  title,
  description,
  hideDescription = true,
  actions,
  summary,
  filters,
  exportSlot,
  subheader,
  children,
  footer,
  layout = "split",
  className,
}: AccountsListingPageProps) {
  const filterRow =
    exportSlot != null ? (
      <ReportFilterRow end={exportSlot}>{filters}</ReportFilterRow>
    ) : (
      filters
    );

  const listingProps: AccountsTableListingProps = {
    summary,
    toolbar: filterRow,
    subheader,
    footer,
    children,
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(section, title)}
      title={title}
      description={description ?? ""}
      hideDescription={hideDescription}
      actions={actions}
      layout={layout}
      className={className}
    >
      <AccountsTableListing {...listingProps} />
    </AccountsPageShell>
  );
}
