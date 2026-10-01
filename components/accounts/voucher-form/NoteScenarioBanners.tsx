"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/accounts/money-format";

/** Compact inventory notice for return-based Credit / Debit Notes. */
export function NoteInventoryImpactBanner({
  returnDocumentLabel = "return document",
  className,
}: {
  returnDocumentLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50/60 px-3 py-2 text-[12px] text-navy-800",
        className,
      )}
      role="status"
    >
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-navy-600" />
      <p className="leading-snug font-normal">
        Inventory was already affected through the linked {returnDocumentLabel}. This note records
        the accounting adjustment only — product lines are read-only from the source return.
      </p>
    </div>
  );
}

/** Compact notice when the note has no stock impact (direct / scheme / amount). */
export function NoteNoInventoryImpactBanner({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground",
        className,
      )}
      role="status"
    >
      <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <p className="leading-snug font-normal">
        No inventory impact — financial adjustment only.
      </p>
    </div>
  );
}

export interface NoteAmountEligibilityStripProps {
  originalAmount: number;
  previouslyAdjustedAmount: number;
  remainingEligibleAmount: number;
  currentAdjustmentAmount: number;
  /** "credited" for CN, "debited" for DN */
  adjustedVerb?: "credited" | "debited";
  className?: string;
}

/** Compact eligibility strip for amount-based invoice Credit / Debit Notes. */
export function NoteAmountEligibilityStrip({
  originalAmount,
  previouslyAdjustedAmount,
  remainingEligibleAmount,
  currentAdjustmentAmount,
  adjustedVerb = "credited",
  className,
}: NoteAmountEligibilityStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg border border-border bg-muted/15 px-3 py-2",
        className,
      )}
    >
      <EligibilityCell label="Original invoice value" value={formatMoney(originalAmount)} />
      <EligibilityCell
        label={`Previously ${adjustedVerb}`}
        value={formatMoney(previouslyAdjustedAmount)}
      />
      <EligibilityCell
        label="Remaining eligible"
        value={formatMoney(remainingEligibleAmount)}
        emphasize
      />
      <EligibilityCell
        label="Current adjustment"
        value={formatMoney(currentAdjustmentAmount)}
      />
    </div>
  );
}

function EligibilityCell({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-[12px] tabular-nums font-medium truncate",
          emphasize ? "text-brand-700" : "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}
