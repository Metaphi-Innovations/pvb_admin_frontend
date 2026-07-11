"use client";

import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";
import type { TrialBalanceSummary } from "./trial-balance-data";
import {
  ACCOUNTS_REPORT_KPI_GRID_CLASS,
  ACCOUNTS_SUMMARY_LABEL_CLASS,
  ACCOUNTS_SUMMARY_VALUE_CLASS,
} from "@/lib/accounts/accounts-typography";

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
      <p className={ACCOUNTS_SUMMARY_LABEL_CLASS}>{label}</p>
      <p
        className={cn(
          ACCOUNTS_SUMMARY_VALUE_CLASS,
          warn ? "text-red-700" : undefined,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function TrialBalanceSummaryBar({ summary }: { summary: TrialBalanceSummary }) {
  return (
    <div
      className={cn(
        "flex-shrink-0 px-2 py-1.5 border-b border-border/60 bg-muted/10",
        ACCOUNTS_REPORT_KPI_GRID_CLASS,
      )}
    >
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
