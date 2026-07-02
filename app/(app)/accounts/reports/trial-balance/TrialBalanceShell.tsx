"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BreadcrumbItem } from "@/lib/accounts/accounts-nav";

/** Accounts viewport minus main content padding (py-3 × 2) */
const TRIAL_BALANCE_VIEWPORT_HEIGHT = "calc(100vh - 128px)";

export function TrialBalanceShell({
  breadcrumbs,
  title,
  actions,
  filters,
  children,
  className,
}: {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "trial-balance-compact flex flex-col w-full min-h-0 overflow-hidden gap-1",
        className,
      )}
      style={{ height: TRIAL_BALANCE_VIEWPORT_HEIGHT, maxHeight: TRIAL_BALANCE_VIEWPORT_HEIGHT }}
    >
      <nav aria-label="Breadcrumb" className="flex-shrink-0 leading-none">
        <ol className="flex items-center flex-wrap gap-0.5 text-[10px] text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />}
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

      <div className="flex-shrink-0 flex items-center justify-between gap-2 min-h-0">
        <h1 className="text-base font-bold text-navy-700 leading-tight">{title}</h1>
        {actions && <div className="flex items-center gap-1.5 flex-shrink-0">{actions}</div>}
      </div>

      {filters && (
        <div className="flex-shrink-0 border-b border-border/60 pb-1.5">{filters}</div>
      )}

      <div className="flex flex-col flex-1 min-h-0 bg-white shadow-sm border border-border/60 rounded-lg overflow-hidden">
        {children}
      </div>
    </div>
  );
}
