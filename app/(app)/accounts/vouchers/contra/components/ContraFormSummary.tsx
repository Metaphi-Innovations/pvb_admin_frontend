"use client";

import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

/**
 * Compact Contra Summary (right column).
 * Uses existing form state — not a second accounting engine.
 */
export function ContraFormSummary({
  fromAccount,
  toAccount,
  transferAmount,
  branchContext,
  balanced,
  className,
}: {
  fromAccount: string;
  toAccount: string;
  transferAmount: number;
  /** Optional compact "From Branch → To Branch" context. */
  branchContext?: string;
  balanced?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm px-3.5 py-3 space-y-1.5 w-full",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        {balanced ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
          </span>
        ) : null}
      </div>

      {branchContext ? (
        <p className="text-[11px] text-muted-foreground truncate" title={branchContext}>
          {branchContext}
        </p>
      ) : null}

      <TextRow label="From Account" value={fromAccount} />
      <TextRow label="To Account" value={toAccount} />

      <div className="mt-1 rounded-lg bg-brand-50/80 border border-brand-100 px-2.5 py-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-brand-800">Transfer Amount</span>
        <span className="text-sm tabular-nums font-bold text-brand-800">
          {transferAmount > 0 ? formatMoney(transferAmount) : "—"}
        </span>
      </div>
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-foreground text-right break-words min-w-0">
        {value || "—"}
      </span>
    </div>
  );
}
