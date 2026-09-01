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
import { demoFinancialYearStart, demoFinancialYearEnd } from "@/lib/accounts/demo-date-utils";

export function AccountsFilterDateRangeSection({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  showLabel = true,
  min = demoFinancialYearStart(),
  max = demoFinancialYearEnd(),
}: {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  showLabel?: boolean;
  min?: string;
  max?: string;
  /** @deprecated ignored — all date inputs use compact filter sizing */
  size?: "compact" | "default";
}) {
  return (
    <div className="space-y-0.5">
      {showLabel && <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Range</span>}
      <div className="flex items-center gap-1.5">
        <AccountsDateInput
          value={dateFrom}
          min={min}
          max={dateTo || max}
          onChange={(val) => {
            let clamped = val;
            if (min && clamped && clamped < min) clamped = min;
            if (max && clamped && clamped > max) clamped = max;
            onDateFromChange(clamped);
          }}
          aria-label="From date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
        <span className="text-xs text-[#9CA3AF] select-none" aria-hidden>
          —
        </span>
        <AccountsDateInput
          value={dateTo}
          min={dateFrom || min}
          max={max}
          onChange={(val) => {
            let clamped = val;
            if (min && clamped && clamped < min) clamped = min;
            if (max && clamped && clamped > max) clamped = max;
            onDateToChange(clamped);
          }}
          aria-label="To date"
          className={ACCOUNTS_DATE_FILTER_WIDTH_CLASS}
        />
      </div>
    </div>
  );
}
