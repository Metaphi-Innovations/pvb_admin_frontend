"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HrBreadcrumbItem } from "@/lib/hr/hr-nav";

export interface HrPageShellProps {
  breadcrumbs: HrBreadcrumbItem[];
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  toolbar?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  /** form = full-bleed form workspace; standard = padded content card area */
  layout?: "standard" | "form";
  className?: string;
  maxWidthClass?: string;
}

export function HrPageShell({
  breadcrumbs,
  title,
  description,
  icon: Icon,
  actions,
  toolbar,
  badge,
  children,
  layout = "standard",
  className,
  maxWidthClass = "max-w-[1200px]",
}: HrPageShellProps) {
  const isForm = layout === "form";

  return (
    <div className={cn("flex flex-col w-full gap-2.5", isForm && "h-full min-h-0", className)}>
      <nav aria-label="Breadcrumb" className="flex-shrink-0">
        <ol className="flex flex-wrap items-center gap-0.5 text-[11px] text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/70" />}
              {crumb.href && i < breadcrumbs.length - 1 ? (
                <Link href={crumb.href} className="hover:text-brand-700 transition-colors font-medium">
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? "text-foreground font-semibold" : ""}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex-shrink-0 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex items-start gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-md bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-brand-600" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-foreground leading-tight">{title}</h1>
              {badge}
            </div>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug max-w-2xl">{description}</p>
            )}
          </div>
        </div>
        {(toolbar || actions) && (
          <div className="flex items-center flex-shrink-0 flex-wrap justify-end gap-2">
            {toolbar}
            {actions}
          </div>
        )}
      </div>

      <div className={cn("w-full", !isForm && maxWidthClass, isForm && "flex-1 min-h-0")}>
        {children}
      </div>
    </div>
  );
}
