"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";
import type { TrialBalanceSummary } from "./trial-balance-data";

function SummaryCell({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-center px-2.5 py-1.5 rounded-md border border-border/50 bg-white min-h-[52px]",
        warn && "border-red-200 bg-red-50/50",
      )}
    >
      <p className="text-xs font-medium text-muted-foreground leading-none">{label}</p>
      <p
        className={cn(
          "text-sm font-bold tabular-nums leading-tight mt-0.5 truncate",
          warn ? "text-red-700" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function TrialBalanceSummaryBar({ summary }: { summary: TrialBalanceSummary }) {
  return (
    <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-1.5 px-2 py-1.5 border-b border-border/60 bg-muted/10">
      <SummaryCell label="Total Debit" value={formatMoney(summary.totalDebit)} />
      <SummaryCell label="Total Credit" value={formatMoney(summary.totalCredit)} />
      <SummaryCell
        label="Difference"
        value={formatMoney(summary.isBalanced ? 0 : summary.difference)}
        warn={!summary.isBalanced}
      />
      <SummaryCell label="Total Ledgers" value={String(summary.totalLedgers)} />
    </div>
  );
}
