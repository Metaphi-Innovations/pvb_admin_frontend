"use client";

import { cn } from "@/lib/utils";
import {
  ACCOUNTS_SUMMARY_LABEL_CLASS,
  ACCOUNTS_SUMMARY_VALUE_CLASS,
  ACCOUNTS_REPORT_KPI_GRID_CLASS,
} from "@/lib/accounts/accounts-typography";

export interface AccountsSummaryItem {
  label: string;
  value: string;
  warn?: boolean;
}

export function AccountsSummaryBar({
  items,
  className,
}: {
  items: AccountsSummaryItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 px-3 py-2 border-b border-[#E5E7EB] bg-white",
        ACCOUNTS_REPORT_KPI_GRID_CLASS,
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-[#E5E7EB] bg-white min-h-[44px] min-w-0",
            item.warn && "border-red-200 bg-red-50/50",
          )}
        >
          <p className={ACCOUNTS_SUMMARY_LABEL_CLASS}>{item.label}</p>
          <p
            className={cn(
              ACCOUNTS_SUMMARY_VALUE_CLASS,
              item.warn ? "text-red-700" : undefined,
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
