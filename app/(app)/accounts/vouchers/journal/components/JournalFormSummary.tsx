"use client";

import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

/**
 * Compact Journal Summary (right column).
 * Uses existing form state — not a second accounting engine.
 */
export function JournalFormSummary({
  debitAccount,
  creditAccount,
  journalAmount,
  balanced,
  className,
}: {
  debitAccount: string;
  creditAccount: string;
  journalAmount: number;
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

      <TextRow label="Debit Account" value={debitAccount} />
      <TextRow label="Credit Account" value={creditAccount} />

      <div className="mt-1 rounded-lg bg-brand-50/80 border border-brand-100 px-2.5 py-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-brand-800">Journal Amount</span>
        <span className="text-sm tabular-nums font-bold text-brand-800">
          {journalAmount > 0 ? formatMoney(journalAmount) : "—"}
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
