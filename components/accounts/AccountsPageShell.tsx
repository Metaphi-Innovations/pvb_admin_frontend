"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/accounts/accounts-nav";

export interface AccountsPageShellProps {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  description: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** split = full-height table/workbench; standard = form or detail card */
  layout?: "standard" | "split";
  className?: string;
}

export function AccountsPageShell({
  breadcrumbs,
  title,
  description,
  actions,
  filters,
  footer,
  children,
  layout = "standard",
  className,
}: AccountsPageShellProps) {
  const isConstrainedHeight = layout === "split" || className?.includes("h-full");

  return (
    <div
      className={cn(
        "flex flex-col w-full gap-3",
        isConstrainedHeight && "h-full min-h-0 overflow-hidden",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex-shrink-0">
        <ol className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
              {crumb.href && i < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-brand-700 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? "text-foreground font-medium" : ""}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex-shrink-0 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-page-title">{title}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>

      {filters && (
        <div className="flex-shrink-0 rounded-lg border border-border/60 bg-white px-4 py-2.5 shadow-sm">
          {filters}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col w-full bg-white shadow-sm border border-border/60 rounded-lg",
          isConstrainedHeight && "flex-1 min-h-0 overflow-hidden",
        )}
      >
        {footer ? (
          <>
            <div className={cn("flex flex-col", isConstrainedHeight && "flex-1 min-h-0 overflow-hidden")}>
              {children}
            </div>
            <div className="flex-shrink-0 border-t border-border/60">{footer}</div>
          </>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
