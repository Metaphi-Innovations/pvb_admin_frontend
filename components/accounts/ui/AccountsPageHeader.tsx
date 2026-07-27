"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/accounts/accounts-nav";
import {
  ACCOUNTS_BREADCRUMB_CLASS,
  ACCOUNTS_BREADCRUMB_CURRENT_CLASS,
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";

export interface AccountsPageBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  compact?: boolean;
}

/** Standard Accounts breadcrumb row. */
export function AccountsPageBreadcrumbs({
  items,
  className,
  compact,
}: AccountsPageBreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex-shrink-0 leading-none", className)}>
      <ol className={cn(ACCOUNTS_BREADCRUMB_CLASS, compact && "gap-0.5 text-xs")}>
        {items.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
            {i > 0 && (
              <ChevronRight
                className={cn("text-muted-foreground", compact ? "w-2.5 h-2.5" : "w-3 h-3")}
              />
            )}
            {crumb.href && i < items.length - 1 ? (
              <Link href={crumb.href} className="hover:text-brand-700 transition-colors">
                {crumb.label}
              </Link>
            ) : (
              <span className={i === items.length - 1 ? ACCOUNTS_BREADCRUMB_CURRENT_CLASS : ""}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface AccountsPageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  layout?: "standard" | "split" | "form";
  className?: string;
  hideDescription?: boolean;
  subHeader?: React.ReactNode;
  /** Status / document badge rendered with page actions */
  statusBadge?: React.ReactNode;
}

/**
 * Canonical Accounts listing/report page header + body shell.
 * Thin wrapper over AccountsPageShell — use this for new work.
 */
export function AccountsPageHeader({
  breadcrumbs,
  title,
  description = "",
  actions,
  toolbar,
  filters,
  footer,
  children,
  layout = "standard",
  className,
  hideDescription,
  subHeader,
  statusBadge,
}: AccountsPageHeaderProps) {
  const mergedActions =
    statusBadge || actions ? (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {statusBadge}
        {actions}
      </div>
    ) : undefined;

  return (
    <AccountsPageShell
      breadcrumbs={breadcrumbs}
      title={title}
      description={description}
      actions={mergedActions}
      toolbar={toolbar}
      filters={filters}
      footer={footer}
      layout={layout}
      className={className}
      hideDescription={hideDescription}
      subHeader={subHeader}
    >
      {children ?? null}
    </AccountsPageShell>
  );
}

/** Standalone title row for custom layouts that already own breadcrumbs. */
export function AccountsPageTitleRow({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 flex flex-wrap items-center justify-between gap-x-3 gap-y-1",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>{title}</h1>
        {description ? <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>{description}</p> : null}
      </div>
      {actions ? (
        <div className="flex items-center flex-shrink-0 flex-wrap justify-end gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
