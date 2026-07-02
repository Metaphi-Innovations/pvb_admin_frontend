"use client";

import { cn } from "@/lib/utils";
import {
  formatBalanceAmount,
  formatMoney,
} from "@/lib/accounts/money-format";
import type { CoaListingSummary } from "../coa-listing-data";

function SummaryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-border/50 bg-white min-h-[44px]",
        className,
      )}
    >
      <p className="text-[10px] font-medium text-muted-foreground leading-none">{label}</p>
      <p className="text-xs font-bold tabular-nums leading-tight mt-0.5 truncate text-foreground">
        {value}
      </p>
    </div>
  );
}

export function CoaListingSummaryBar({
  summary,
  totalLabel = "Total Accounts / Ledgers",
}: {
  summary: CoaListingSummary;
  totalLabel?: string;
}) {
  const opening =
    summary.openingAmount > 0
      ? formatBalanceAmount(summary.openingAmount, summary.openingSide)
      : "—";
  const closing =
    summary.closingAmount > 0
      ? formatBalanceAmount(summary.closingAmount, summary.closingSide)
      : "—";

  return (
    <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 px-2 py-1.5 border-b border-border/60 bg-muted/10">
      <SummaryCell label={totalLabel} value={String(summary.totalAccounts)} />
      <SummaryCell label="Opening Balance" value={opening} />
      <SummaryCell label="Total Debit" value={formatMoney(summary.periodDebit)} />
      <SummaryCell label="Total Credit" value={formatMoney(summary.periodCredit)} />
      <SummaryCell label="Closing Balance" value={closing} />
    </div>
  );
}
