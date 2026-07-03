"use client";

import { formatBalanceAmount } from "@/lib/accounts/money-format";
import type { GeneralLedgerSummary } from "./general-ledger-data";

export function GeneralLedgerDetailHeader({ summary }: { summary: GeneralLedgerSummary }) {
  return (
    <div className="flex-shrink-0 flex flex-wrap items-start justify-between gap-3 px-3 py-2.5 border-b border-border/60 bg-muted/10">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-bold text-navy-700 leading-tight truncate">{summary.ledgerName}</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          <span className="font-mono font-semibold text-brand-700">{summary.ledgerCode}</span>
          <span className="mx-1.5 text-border">·</span>
          <span>{summary.ledgerType}</span>
          <span className="mx-1.5 text-border">·</span>
          <span className="truncate">{summary.parentGroup}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-stretch gap-2 flex-shrink-0">
        <div className="px-3 py-1.5 rounded-md border border-border/50 bg-white min-w-[120px]">
          <p className="text-[10px] font-medium text-muted-foreground leading-none">Opening Balance</p>
          <p className="text-xs font-bold tabular-nums text-foreground mt-0.5">
            {formatBalanceAmount(summary.openingBalance, summary.openingBalanceType)}
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-md border border-border/50 bg-white min-w-[120px]">
          <p className="text-[10px] font-medium text-muted-foreground leading-none">Current Balance</p>
          <p className="text-xs font-bold tabular-nums text-foreground mt-0.5">
            {formatBalanceAmount(summary.currentBalance, summary.currentBalanceType)}
          </p>
        </div>
      </div>
    </div>
  );
}
