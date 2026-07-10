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
import {
  AccountsListingFilterCard,
  AccountsListingTableCard,
} from "@/components/accounts/AccountsListingHeader";

export interface AccountsPageShellProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  actions?: React.ReactNode;
  /** Search / filter / export toolbar — aligned top-right in title row */
  toolbar?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** split = full-height table/workbench; form = centered voucher/detail (no table shell); standard = listing card */
  layout?: "standard" | "split" | "form";
  className?: string;
  /** Hide description line in compact split layout */
  hideDescription?: boolean;
}

export function AccountsPageShell({
  breadcrumbs,
  title,
  description,
  actions,
  toolbar,
  filters,
  footer,
  children,
  layout = "standard",
  className,
  hideDescription,
}: AccountsPageShellProps) {
  const isSplit = layout === "split";
  const isForm = layout === "form";
  const isConstrainedHeight = isSplit || className?.includes("h-full");
  const showDescription = !hideDescription && !(isSplit && description.length > 80);

  return (
    <div
      className={cn(
        "flex flex-col w-full",
        isSplit ? "h-full min-h-0 overflow-hidden gap-2" : "gap-2",
        isConstrainedHeight && !isSplit && "h-full min-h-0 overflow-hidden",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex-shrink-0 leading-none">
        <ol className={cn(ACCOUNTS_BREADCRUMB_CLASS, isSplit && "gap-0.5", isForm && "text-xs")}>
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
              {i > 0 && (
                <ChevronRight
                  className={cn(
                    "text-slate-400",
                    isSplit ? "w-2.5 h-2.5" : "w-3 h-3",
                  )}
                />
              )}
              {crumb.href && i < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-brand-700 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? ACCOUNTS_BREADCRUMB_CURRENT_CLASS : ""}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div
        className={cn(
          "flex-shrink-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 min-h-0",
          !isSplit && "items-start",
        )}
      >
        <div className="min-w-0 flex-1">
          <h1 className={cn(ACCOUNTS_PAGE_TITLE_CLASS, isSplit && "leading-tight")}>
            {title}
          </h1>
          {showDescription && (
            <p
              className={cn(
                ACCOUNTS_PAGE_SUBTITLE_CLASS,
                isSplit && "leading-snug line-clamp-1",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {(toolbar || actions) && (
          <div
            className={cn(
              "flex items-center flex-shrink-0 flex-wrap justify-end",
              isSplit ? "gap-1.5" : "gap-2",
            )}
          >
            {toolbar}
            {actions}
          </div>
        )}
      </div>

      {filters && <AccountsListingFilterCard>{filters}</AccountsListingFilterCard>}

      <div
        className={cn(
          "flex flex-col w-full flex-1 min-h-0",
          isConstrainedHeight && "overflow-hidden",
        )}
      >
        {isSplit ? (
          children
        ) : isForm ? (
          <div className="w-full pb-2">{children}</div>
        ) : (
          <AccountsListingTableCard>
            {children}
            {footer ? (
              <div className="flex-shrink-0 border-t border-border/60">{footer}</div>
            ) : null}
          </AccountsListingTableCard>
        )}
      </div>
    </div>
  );
}
