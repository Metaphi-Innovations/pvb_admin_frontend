"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EntityFormBreadcrumb {
  label: string;
  href?: string;
}

export function EntityFormLayout({
  title,
  subtitle,
  breadcrumbs,
  statusSlot,
  footer,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: EntityFormBreadcrumb[];
  statusSlot?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-full", className)}>
      <div className="border-b border-border bg-white px-5 py-3 sticky top-0 z-20 shadow-sm">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 mb-2 flex-wrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="text-helper text-muted-foreground hover:text-brand-600 font-medium"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-helper font-medium text-brand-600">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-page-title">{title}</h1>
            {subtitle && <p className="text-helper text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {statusSlot}
        </div>
      </div>

      <div className="page-container max-w-5xl">{children}</div>

      {footer && (
        <div className="sticky bottom-0 border-t border-border bg-white px-5 py-3 flex items-center justify-end gap-2 shadow-sm">
          {footer}
        </div>
      )}
    </div>
  );
}

export function EntityFormSection({
  title,
  description,
  children,
  columns = 2,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const grid =
    columns === 3
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      : columns === 1
        ? "grid-cols-1"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <section className={cn("page-shell p-4 mb-4", className)}>
      <div className="mb-3 pb-2 border-b border-border/50">
        <h2 className="text-section-title text-navy-800">{title}</h2>
        {description && <p className="text-helper text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className={cn("grid gap-3", grid)}>{children}</div>
    </section>
  );
}

export function EntityFormField({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function EntityFormFooterActions({
  onCancel,
  onSave,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  cancelLabel?: string;
  saving?: boolean;
}) {
  return (
    <>
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel} disabled={saving}>
        {cancelLabel}
      </Button>
      <Button size="sm" className="h-8 text-xs btn-primary-brand" onClick={onSave} disabled={saving}>
        {saveLabel}
      </Button>
    </>
  );
}
