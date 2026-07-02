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
  /** Hide description line in compact split layout */
  hideDescription?: boolean;
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
  hideDescription,
}: AccountsPageShellProps) {
  const isSplit = layout === "split";
  const isConstrainedHeight = isSplit || className?.includes("h-full");
  const showDescription = !hideDescription && !(isSplit && description.length > 80);

  return (
    <div
      className={cn(
        "flex flex-col w-full",
        isSplit ? "h-full min-h-0 overflow-hidden gap-1" : "gap-3",
        isConstrainedHeight && !isSplit && "h-full min-h-0 overflow-hidden",
        className,
      )}
    >
      <nav aria-label="Breadcrumb" className="flex-shrink-0 leading-none">
        <ol
          className={cn(
            "flex items-center flex-wrap text-muted-foreground",
            isSplit ? "gap-0.5 text-[10px]" : "gap-1 text-xs",
          )}
        >
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
              {i > 0 && (
                <ChevronRight
                  className={cn(
                    "text-muted-foreground/50",
                    isSplit ? "w-2.5 h-2.5" : "w-3 h-3",
                  )}
                />
              )}
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

      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-between gap-2 min-h-0",
          !isSplit && "items-start gap-4",
        )}
      >
        <div className="min-w-0 flex-1">
          <h1
            className={cn(
              isSplit
                ? "text-base font-bold text-navy-700 leading-tight"
                : "text-page-title",
            )}
          >
            {title}
          </h1>
          {showDescription && (
            <p
              className={cn(
                "text-muted-foreground mt-0.5",
                isSplit ? "text-[10px] leading-snug line-clamp-1" : "text-sm",
              )}
            >
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className={cn("flex items-center flex-shrink-0", isSplit ? "gap-1.5" : "gap-2")}>
            {actions}
          </div>
        )}
      </div>

      {filters && (
        <div
          className={cn(
            "flex-shrink-0 z-20 bg-white",
            isSplit
              ? "border-b border-border/60 pb-1.5"
              : "rounded-lg border border-border/60 bg-white px-3 py-2 shadow-sm",
          )}
        >
          {filters}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col w-full bg-white border border-border/50 rounded-lg overflow-hidden",
          isSplit ? "shadow-none" : "shadow-sm",
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
