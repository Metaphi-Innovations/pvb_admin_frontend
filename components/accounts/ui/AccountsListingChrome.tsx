"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/accounts/accounts-nav";
import {
  AccountsPageBreadcrumbs,
  AccountsPageTitleRow,
} from "@/components/accounts/ui/AccountsPageHeader";

/**
 * Drop-in replacement for global PageHeader inside Accounts listings
 * that still use AppLayout (Expenses, Payments, Purchase, etc.).
 * Matches Accounts page-title / breadcrumb density — no icon tile, no mb-6.
 */
export function AccountsListingChrome({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 flex-shrink-0", className)}>
      <AccountsPageBreadcrumbs items={breadcrumbs} />
      <AccountsPageTitleRow title={title} description={description} actions={actions} />
    </div>
  );
}
