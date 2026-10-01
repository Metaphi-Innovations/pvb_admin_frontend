"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { HR_ICON_BOX_CLASS, HR_ICON_CLASS, HR_PAGE_MAX_CLASS } from "./hr-org-form";

/**
 * Organization Setup page chrome — title + top-right actions share content width.
 */
export function HrOrgPageHeader({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  /** Listings: wide (1400). Forms: pass HR_FORM_MAX_CLASS (~1160). */
  maxWidthClass = HR_PAGE_MAX_CLASS,
  sectionLabel = "Organization Setup",
  sectionHref = "/hr/settings",
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidthClass?: string;
  /** Parent settings group label in breadcrumb */
  sectionLabel?: string;
  sectionHref?: string;
}) {
  const crumbs = hrBreadcrumb(
    { label: "Settings", href: "/hr/settings" },
    { label: sectionLabel, href: sectionHref },
    { label: title },
  );

  return (
    <div className={cn("flex flex-col w-full", className)}>
      <div className={cn("w-full space-y-3", maxWidthClass)}>
        <nav aria-label="Breadcrumb" className="flex-shrink-0">
          <ol className="flex flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground">
            {crumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/70" />}
                {crumb.href && i < crumbs.length - 1 ? (
                  <Link href={crumb.href} className="hover:text-brand-700 transition-colors font-medium">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={i === crumbs.length - 1 ? "text-foreground font-semibold" : ""}>
                    {crumb.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-3 border-b border-border">
          <div className="min-w-0 flex items-start gap-2.5">
            {Icon && (
              <div className={HR_ICON_BOX_CLASS}>
                <Icon className={HR_ICON_CLASS} />
              </div>
            )}
            <div className="min-w-0 pt-0.5">
              <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug max-w-xl">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex items-center flex-shrink-0 flex-wrap justify-end gap-2 pt-0.5">
              {actions}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
