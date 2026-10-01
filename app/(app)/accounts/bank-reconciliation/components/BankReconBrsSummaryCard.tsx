"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { BankReconBrsSummary } from "@/lib/accounts/bank-recon-tally-types";

function Row({
  label,
  value,
  emphasize,
  asCount,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  asCount?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[11px]">
      <span className={cn("text-muted-foreground", emphasize && "font-semibold text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          emphasize && "text-sm font-bold text-foreground",
        )}
      >
        {asCount ? value : formatMoney(value)}
      </span>
    </div>
  );
}

export function BankReconBrsSummaryCard({ summary }: { summary: BankReconBrsSummary }) {
  const isCc = summary.balanceSign === "cash_credit";
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex-shrink-0 rounded-lg bg-brand-50/45 overflow-hidden">
      <div className="min-h-[50px] px-3 flex items-center gap-6 whitespace-nowrap overflow-x-auto">
        <SummaryMetric
          label="Balance as per Books"
          value={formatMoney(summary.balanceAsPerBooks)}
          strong
        />
        <SummaryMetric
          label="Expected Bank Balance"
          value={formatMoney(summary.expectedBalanceAsPerBank)}
          strong
        />
        <SummaryMetric label="Unreconciled Deposits" value={formatMoney(summary.unreconciledDeposits)} />
        <SummaryMetric
          label="Unreconciled Withdrawals"
          value={formatMoney(summary.unreconciledWithdrawals)}
        />
        <SummaryMetric label="Pending" value={String(summary.pendingCount)} />
        <SummaryMetric label="Reconciled" value={String(summary.reconciledCount)} />
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="ml-auto inline-flex h-7 flex-shrink-0 items-center gap-1 px-2 text-[10px] font-semibold text-foreground hover:bg-white/70 rounded-md"
          aria-expanded={expanded}
        >
          View Details
          <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
        </button>
      </div>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 border-t border-brand-100 bg-white/70 px-3 py-1.5">
          <div className="divide-y divide-border/50">
            <Row label="Balance as per Books" value={summary.balanceAsPerBooks} emphasize />
            <Row
              label={
                isCc
                  ? "Unreconciled Deposits (repayments pending bank)"
                  : "Unreconciled Deposits"
              }
              value={summary.unreconciledDeposits}
            />
            <Row
              label={
                isCc
                  ? "Unreconciled Withdrawals (drawdowns pending bank)"
                  : "Unreconciled Withdrawals"
              }
              value={summary.unreconciledWithdrawals}
            />
          </div>
          <div className="divide-y divide-border/50 md:border-l md:border-border/60 md:pl-5">
            <Row
              label="Expected Balance as per Bank"
              value={summary.expectedBalanceAsPerBank}
              emphasize
            />
            <Row label="Reconciled Count" value={summary.reconciledCount} asCount />
            <Row label="Pending Count" value={summary.pendingCount} asCount />
          </div>
          <p className="md:col-span-2 text-[10px] text-muted-foreground pt-1 leading-tight">
            {isCc
              ? "Cash Credit: Expected = Books − Unreconciled Withdrawals + Unreconciled Deposits (utilization-positive)."
              : "Current: Expected = Books + Unreconciled Withdrawals − Unreconciled Deposits."}
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <span className="flex flex-col flex-shrink-0 gap-0.5">
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn("text-xs font-semibold tabular-nums text-foreground", strong && "font-bold")}>
        {value}
      </span>
    </span>
  );
}
