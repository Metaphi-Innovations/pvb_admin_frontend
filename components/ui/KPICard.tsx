"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { kpiAccents } from "@/lib/tokens";

type AccentKey = keyof typeof kpiAccents;

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: { value: number; label?: string };
  icon: LucideIcon;
  accent?: AccentKey;
  footer?: React.ReactNode;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  accent = "orange",
  footer,
  loading = false,
  className,
  onClick,
}: KPICardProps) {
  const colors = kpiAccents[accent];

  const TrendIcon =
    !change ? null
    : change.value > 0 ? TrendingUp
    : change.value < 0 ? TrendingDown
    : Minus;

  const trendColor =
    !change ? ""
    : change.value > 0 ? "text-emerald-600"
    : change.value < 0 ? "text-red-500"
    : "text-muted-foreground";

  if (loading) {
    return (
      <div className={cn("bg-white rounded-card border border-border p-5 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 rounded skeleton" />
          <div className="h-9 w-9 rounded-xl skeleton" />
        </div>
        <div className="h-8 w-28 rounded skeleton" />
        <div className="h-3 w-16 rounded skeleton" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-card border border-border p-5 shadow-card",
        "transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5",
        className,
      )}
      onClick={onClick}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: colors.border,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-helper font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: colors.bg }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: colors.icon }} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div className="mb-1">
        <span className="text-[28px] font-bold leading-none tracking-tight text-foreground">
          {value}
        </span>
      </div>

      {/* Subtitle + trend */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-helper text-muted-foreground truncate">{subtitle}</span>
        {change && TrendIcon && (
          <span className={cn("flex items-center gap-0.5 text-[11px] font-semibold", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            {Math.abs(change.value)}%{" "}
            <span className="font-normal text-muted-foreground">
              {change.label ?? "vs last month"}
            </span>
          </span>
        )}
      </div>

      {footer && (
        <>
          <div className="mt-3 pt-3 border-t border-border/60">{footer}</div>
        </>
      )}
    </div>
  );
}

// ── Mini KPI (compact, used in sidebars or summary rows) ─────────────────────
export function MiniKPI({
  label,
  value,
  icon: Icon,
  accent = "orange",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: AccentKey;
}) {
  const colors = kpiAccents[accent];
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: colors.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: colors.icon }} />
      </div>
      <div>
        <p className="text-helper text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ── Horizontal Mini KPI Card (Icon on left, value/label stacked on right) ──
interface MiniKPICardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}

export function MiniKPICard({
  label,
  value,
  icon: Icon,
  accent = false,
  compact = false,
  className,
  ...props
}: MiniKPICardProps & { compact?: boolean }) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-border/50 bg-white min-h-[44px]",
          className,
        )}
        {...props}
      >
        <p className="text-[10px] font-medium text-muted-foreground leading-none">{label}</p>
        <p className="text-sm font-bold text-foreground tabular-nums leading-tight mt-0.5 truncate">
          {value}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-border p-3 flex items-center gap-3",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
          accent ? "bg-brand-600" : "bg-muted"
        )}
      >
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}


