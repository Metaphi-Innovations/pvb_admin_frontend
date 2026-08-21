"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export function ReceiptSummaryCard({
  gross,
  adjDebit,
  adjCredit,
  netBank,
  totalAllocated,
  advance,
  partyKind,
  className,
}: {
  gross: number;
  adjDebit: number;
  adjCredit: number;
  netBank: number;
  totalAllocated: number;
  advance: number;
  partyKind: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/15 px-3.5 py-3 space-y-1.5 w-full max-w-[360px]",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Receipt Summary
      </p>
      <Row label="Gross Party Settlement Amount" value={gross} />
      <Row label="Total Debit Adjustments" value={adjDebit} />
      <Row label="Total Credit Adjustments" value={adjCredit} />
      <Row label="Net Cash / Bank Amount" value={netBank} emphasize />
      {partyKind !== "OTHER_LEDGER" ? (
        <>
          <Row label="Total Allocated" value={totalAllocated} />
          {partyKind === "CUSTOMER" ? (
            <Row label="Customer Advance / Unallocated" value={advance} />
          ) : null}
        </>
      ) : null}
      {partyKind === "CUSTOMER" ? (
        <p className="text-[11px] text-muted-foreground pt-1">
          Allocated + Advance = Gross Party Amount
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums font-medium",
          emphasize && "text-brand-700 font-semibold",
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
