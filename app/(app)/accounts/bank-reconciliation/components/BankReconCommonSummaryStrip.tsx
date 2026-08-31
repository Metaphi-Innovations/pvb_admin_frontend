"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { WorkspaceSummaryUi } from "@/lib/accounts/bank-recon-api-mappers";
import type { BankReconWorkspaceMode } from "./BankReconModeSwitch";

function Metric({
  label,
  value,
  strong,
  warn,
}: {
  label: string;
  value: string;
  strong?: boolean;
  warn?: boolean;
}) {
  return (
    <span className="flex flex-col flex-shrink-0 gap-0.5">
      <span className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums text-foreground",
          strong && "font-bold",
          warn && "text-red-700",
        )}
      >
        {value}
      </span>
    </span>
  );
}

/** Common summary strip for Manual + Statement modes — values from backend dashboard/counts. */
export function BankReconCommonSummaryStrip({
  mode,
  summary,
}: {
  mode: BankReconWorkspaceMode;
  summary: WorkspaceSummaryUi;
}) {
  const showStatement = summary.statementBalance != null;

  return (
    <div className="flex-shrink-0 rounded-lg bg-brand-50/45 overflow-hidden">
      <div className="min-h-[50px] px-3 flex items-center gap-5 whitespace-nowrap overflow-x-auto">
        <Metric
          label="Balance as per Books"
          value={formatMoney(summary.balanceAsPerBooks)}
          strong
        />
        <Metric
          label="Bank Statement Balance"
          value={showStatement ? formatMoney(summary.statementBalance!) : "—"}
          strong
        />
        <Metric label="Unreconciled Deposits" value="—" />
        <Metric label="Unreconciled Withdrawals" value="—" />
        <Metric
          label="Unmatched Bank Entries"
          value={
            mode === "statement" && summary.unmatchedBankEntries != null
              ? String(summary.unmatchedBankEntries)
              : showStatement && summary.unmatchedBankEntries != null
                ? String(summary.unmatchedBankEntries)
                : "—"
          }
        />
        <Metric label="Pending" value={String(summary.pendingCount)} />
        <Metric
          label="Reconciled"
          value={summary.reconciledCount != null ? String(summary.reconciledCount) : "—"}
        />
        <Metric
          label="Difference"
          value={
            summary.difference == null ? "—" : formatMoney(Math.abs(summary.difference))
          }
          warn={summary.difference != null && summary.difference !== 0}
        />
      </div>
    </div>
  );
}
