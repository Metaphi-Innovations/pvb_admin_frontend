"use client";

/**
 * Compact summary metric cards for accounts listing/report pages.
 */

import { cn } from "@/lib/utils";
import {
  ACCOUNTS_SUMMARY_LABEL_CLASS,
  ACCOUNTS_SUMMARY_VALUE_CLASS,
} from "@/lib/accounts/accounts-typography";

export interface AccountsSummaryCardItem {
  label: string;
  value: string;
  warn?: boolean;
}

export interface AccountsSummaryCardsProps {
  items: AccountsSummaryCardItem[];
  className?: string;
  /** Grid columns at lg breakpoint — default 5 for COA-style summaries */
  columns?: 3 | 4 | 5;
}

export function AccountsSummaryCards({
  items,
  className,
  columns = 5,
}: AccountsSummaryCardsProps) {
  const colClass =
    columns === 3
      ? "lg:grid-cols-3"
      : columns === 4
        ? "lg:grid-cols-4"
        : "lg:grid-cols-5";

  return (
    <div
      className={cn(
        "flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-1.5 px-3 py-2 border-b border-[#E5E7EB] bg-white",
        colClass,
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white min-h-[40px]",
            item.warn && "border-red-200 bg-red-50/50",
          )}
        >
          <p className={ACCOUNTS_SUMMARY_LABEL_CLASS}>{item.label}</p>
          <p
            className={cn(
              ACCOUNTS_SUMMARY_VALUE_CLASS,
              item.warn && "text-red-700",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}