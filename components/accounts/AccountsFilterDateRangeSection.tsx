"use client";

/**
 * Shared From/To date inputs for accounts filters.
 * Kept in its own module so ReportFilters and AccountsListingFilter
 * do not form a circular import (which left ReportDateRangeFilter undefined under SSR).
 */

import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import {
  ACCOUNTS_DATE_FILTER_WIDTH_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/lib/accounts/accounts-typography";

export function AccountsFilterDateRangeSection({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showLabel = true,
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showLabel?: boolean;
  /** @deprecated ignored — all date inputs use compact filter sizing */
  size?: "compact" | "default";
}) {
  return (
    <div className="space-y-0.5">
      {showLabel && <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Range</span>}
      <div className="flex items-center gap-1.5">
        <AccountsDateInput
          value={dateFrom}
          onChange={onDateFromChange}
          aria-label="From date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
        <span className="text-xs text-[#9CA3AF] select-none" aria-hidden>
          —
        </span>
        <AccountsDateInput
          value={dateTo}
          onChange={onDateToChange}
          aria-label="To date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
      </div>
    </div>
  );
}
