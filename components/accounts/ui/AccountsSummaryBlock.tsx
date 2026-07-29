"use client";

import { cn } from "@/lib/utils";
import {
  ACCOUNTS_UI_GRAND_TOTAL_CLASS,
  ACCOUNTS_UI_SUMMARY_AMOUNT_CLASS,
  ACCOUNTS_UI_SUMMARY_LABEL_CLASS,
  ACCOUNTS_UI_SUMMARY_ROW_CLASS,
} from "@/lib/accounts/accounts-ui-tokens";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import type { AccountsSummaryCardItem } from "@/components/accounts/AccountsSummaryCards";

export interface AccountsSummaryRow {
  label: string;
  amount: string;
  emphasize?: boolean;
}

export interface AccountsSummaryBlockProps {
  /** Compact label/amount rows (form totals, tax, posting) */
  rows?: AccountsSummaryRow[];
  /** Listing/report metric tiles — reuses AccountsSummaryCards */
  cards?: AccountsSummaryCardItem[];
  title?: string;
  className?: string;
  /** Limit width so summaries don't stretch full page */
  narrow?: boolean;
}

/**
 * Unified summary pattern — row list for forms, card strip for listings/reports.
 */
export function AccountsSummaryBlock({
  rows,
  cards,
  title,
  className,
  narrow = true,
}: AccountsSummaryBlockProps) {
  if (cards && cards.length > 0) {
    return <AccountsSummaryCards items={cards} className={className} />;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white px-3 py-2 space-y-0.5",
        narrow && "w-full max-w-sm ml-auto",
        className,
      )}
    >
      {title ? (
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground pb-1">
          {title}
        </p>
      ) : null}
      {(rows ?? []).map((row) => (
        <div key={row.label} className={ACCOUNTS_UI_SUMMARY_ROW_CLASS}>
          <span className={ACCOUNTS_UI_SUMMARY_LABEL_CLASS}>{row.label}</span>
          <span
            className={cn(
              ACCOUNTS_UI_SUMMARY_AMOUNT_CLASS,
              row.emphasize && ACCOUNTS_UI_GRAND_TOTAL_CLASS,
            )}
          >
            {row.amount}
          </span>
        </div>
      ))}
    </div>
  );
}
