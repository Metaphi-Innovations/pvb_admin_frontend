"use client";

/**
 * Shared responsive layout primitives for Accounts report screens.
 * Use these for consistent KPI grids, filter fields, and report body structure.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  ACCOUNTS_REPORT_BODY_CLASS,
  ACCOUNTS_REPORT_FILTER_FIELD_CLASS,
  ACCOUNTS_REPORT_KPI_CARD_CLASS,
  ACCOUNTS_REPORT_KPI_GRID_CLASS,
  ACCOUNTS_REPORT_KPI_LABEL_CLASS,
  ACCOUNTS_REPORT_KPI_VALUE_CLASS,
  ACCOUNTS_REPORT_TABLE_SECTION_CLASS,
} from "@/lib/accounts/accounts-typography";

export {
  ACCOUNTS_REPORT_BODY_CLASS,
  ACCOUNTS_REPORT_FILTER_FIELD_CLASS,
  ACCOUNTS_REPORT_KPI_CARD_CLASS,
  ACCOUNTS_REPORT_KPI_GRID_CLASS,
  ACCOUNTS_REPORT_KPI_LABEL_CLASS,
  ACCOUNTS_REPORT_KPI_VALUE_CLASS,
  ACCOUNTS_REPORT_TABLE_SECTION_CLASS,
};

/** Standard vertical stack for report content below the page filter card */
export function AccountsReportBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ACCOUNTS_REPORT_BODY_CLASS, className)}>{children}</div>;
}

/**
 * Responsive KPI grid — equal-width cards that auto-wrap (min 180px per card).
 * Works across 1280px–1920px without overlap.
 */
export function AccountsReportKpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(ACCOUNTS_REPORT_KPI_GRID_CLASS, className)}>{children}</div>;
}

export interface AccountsReportKpiCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  warning?: boolean;
  /** Render numeric values as plain counts instead of currency */
  isCount?: boolean;
  /** Custom formatter when value is numeric (e.g. quantity) */
  formatValue?: (value: number) => string;
}

/** Icon KPI card with safe currency display — amounts never truncate/overlap */
export function AccountsReportKpiCard({
  label,
  value,
  icon: Icon,
  accent,
  warning,
  isCount,
  formatValue,
}: AccountsReportKpiCardProps) {
  const displayValue =
    typeof value === "number"
      ? isCount
        ? String(value)
        : formatValue
          ? formatValue(value)
          : formatMoney(value)
      : value;

  return (
    <div
      className={cn(
        ACCOUNTS_REPORT_KPI_CARD_CLASS,
        warning && "border-amber-300 bg-amber-50/40",
      )}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
          warning ? "bg-amber-100" : accent ? "bg-brand-600" : "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "w-3.5 h-3.5",
            warning ? "text-amber-600" : accent ? "text-white" : "text-muted-foreground",
          )}
        />
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <p className={ACCOUNTS_REPORT_KPI_VALUE_CLASS}>{displayValue}</p>
        <p className={ACCOUNTS_REPORT_KPI_LABEL_CLASS}>{label}</p>
      </div>
    </div>
  );
}

/** Table card wrapper for split-layout report pages */
export function AccountsReportTableSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(ACCOUNTS_REPORT_TABLE_SECTION_CLASS, className)}>
      {children}
    </div>
  );
}

/** Consistent label + control wrapper for inline report filters */
export function ReportFilterField({
  label,
  children,
  className,
  minWidthClass = "min-w-[140px]",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  minWidthClass?: string;
}) {
  return (
    <div className={cn(ACCOUNTS_REPORT_FILTER_FIELD_CLASS, minWidthClass, className)}>
      {typeof label === "string" ? (
        <span className="accounts-filter-label">{label}</span>
      ) : (
        label
      )}
      {children}
    </div>
  );
}
