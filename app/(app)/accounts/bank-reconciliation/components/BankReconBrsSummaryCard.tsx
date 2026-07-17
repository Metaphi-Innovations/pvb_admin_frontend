"use client";

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

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Bank Reconciliation Summary
        </p>
        {isCc && (
          <span className="text-[10px] font-semibold text-navy-700 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded-full">
            Cash Credit · utilization
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
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
        <div className="divide-y divide-border/50 md:border-l md:border-border/60 md:pl-6">
          <Row
            label="Expected Balance as per Bank"
            value={summary.expectedBalanceAsPerBank}
            emphasize
          />
          <Row label="Reconciled Count" value={summary.reconciledCount} asCount />
          <Row label="Pending Count" value={summary.pendingCount} asCount />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
        {isCc
          ? "Cash Credit: Expected = Books − Unreconciled Withdrawals + Unreconciled Deposits (utilization-positive)."
          : "Current: Expected = Books + Unreconciled Withdrawals − Unreconciled Deposits."}{" "}
        Amount differences must be corrected in the original Payment / Receipt / Contra voucher.
      </p>
    </div>
  );
}
