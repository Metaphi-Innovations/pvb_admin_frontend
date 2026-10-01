"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, type LucideIcon } from "lucide-react";

// ── Breadcrumb ────────────────────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  icon?: LucideIcon;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  icon: Icon,
  actions,
  badge,
  className,
  compact = false,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 mb-2">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && (
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="text-helper text-muted-foreground hover:text-brand-600 transition-colors font-medium"
                >
                  {crumb.label}
                </a>
              ) : (
                <span
                  className={cn(
                    "text-helper font-medium",
                    idx === breadcrumbs.length - 1
                      ? "text-brand-600"
                      : "text-muted-foreground",
                  )}
                >
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-50 to-navy-50 border border-brand-100/80 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Icon className="w-5 h-5 text-brand-600" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className={cn(
                  "font-bold tracking-tight truncate text-navy-900",
                  compact ? "text-lg" : "text-page-title",
                )}
              >
                {title}
              </h1>
              {badge}
            </div>
            {description && (
              <p className="text-helper text-muted-foreground mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

// ── Section header (inside a page) ───────────────────────────────────────────
export function SectionHeader({
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
    <div className={cn("flex items-center justify-between gap-4 mb-4", className)}>
      <div>
        <h2 className="text-section-title text-foreground">{title}</h2>
        {description && (
          <p className="text-helper text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Card header ───────────────────────────────────────────────────────────────
export function CardHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 mb-4", className)}>
      <div className="flex items-center gap-2.5">
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-500" />
          </div>
        )}
        <div>
          <h3 className="text-card-title text-foreground">{title}</h3>
          {description && (
            <p className="text-helper text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
