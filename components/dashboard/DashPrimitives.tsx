"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { KpiAccent } from "@/components/dashboard/mock-data";

export const ACCENT_STYLES: Record<
  KpiAccent,
  { iconBg: string; iconText: string; borderL: string; borderT: string; soft: string }
> = {
  brand: {
    iconBg: "bg-brand-600",
    iconText: "text-white",
    borderL: "border-l-brand-600",
    borderT: "border-t-brand-600",
    soft: "bg-brand-50",
  },
  navy: {
    iconBg: "bg-navy-700",
    iconText: "text-white",
    borderL: "border-l-navy-700",
    borderT: "border-t-navy-700",
    soft: "bg-navy-50",
  },
  amber: {
    iconBg: "bg-amber-500",
    iconText: "text-white",
    borderL: "border-l-amber-500",
    borderT: "border-t-amber-500",
    soft: "bg-amber-50",
  },
  leaf: {
    iconBg: "bg-leaf-600",
    iconText: "text-white",
    borderL: "border-l-leaf-600",
    borderT: "border-t-leaf-600",
    soft: "bg-leaf-50",
  },
  sky: {
    iconBg: "bg-sky-500",
    iconText: "text-white",
    borderL: "border-l-sky-500",
    borderT: "border-t-sky-500",
    soft: "bg-sky-50",
  },
  rose: {
    iconBg: "bg-rose-500",
    iconText: "text-white",
    borderL: "border-l-rose-500",
    borderT: "border-t-rose-500",
    soft: "bg-rose-50",
  },
  violet: {
    iconBg: "bg-violet-600",
    iconText: "text-white",
    borderL: "border-l-violet-600",
    borderT: "border-t-violet-600",
    soft: "bg-violet-50",
  },
  teal: {
    iconBg: "bg-teal-600",
    iconText: "text-white",
    borderL: "border-l-teal-600",
    borderT: "border-t-teal-600",
    soft: "bg-teal-50",
  },
};

export function DashPanel({
  title,
  subtitle,
  children,
  className,
  bodyClassName,
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "bg-white rounded-xl border border-border shadow-sm overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/20">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-navy-700">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn("p-3", bodyClassName)}>{children}</div>
    </section>
  );
}

export function DrillStageRow({
  label,
  count,
  actionHint,
  onClick,
}: {
  label: string;
  count: number;
  actionHint: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-lg border border-border bg-white px-2.5 py-1.5 text-left",
        "hover:border-brand-300 hover:bg-brand-50/50 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{actionHint}</p>
      </div>
      <span className="text-xs font-bold tabular-nums text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5">
        {count}
      </span>
    </button>
  );
}
