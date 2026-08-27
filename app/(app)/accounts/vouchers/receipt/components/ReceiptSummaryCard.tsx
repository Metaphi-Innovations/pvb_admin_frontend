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
  vibrant = false,
}: {
  gross: number;
  adjDebit: number;
  adjCredit: number;
  netBank: number;
  totalAllocated: number;
  advance: number;
  partyKind: string;
  className?: string;
  /** Stronger view-mode chrome */
  vibrant?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 space-y-1.5 w-full max-w-[360px]",
        vibrant
          ? "border-brand-200 bg-gradient-to-b from-[#FFF7ED] to-white shadow-sm"
          : "border-border bg-muted/15",
        className,
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide",
          vibrant ? "text-brand-800" : "text-muted-foreground",
        )}
      >
        Receipt Summary
      </p>
      <Row label="Gross Party Settlement Amount" value={gross} vibrant={vibrant} />
      <Row label="Total Debit Adjustments" value={adjDebit} vibrant={vibrant} />
      <Row label="Total Credit Adjustments" value={adjCredit} vibrant={vibrant} />
      <div
        className={cn(
          "mt-1 rounded-lg px-2.5 py-2",
          vibrant
            ? "bg-brand-600 text-white shadow-sm"
            : "bg-transparent",
        )}
      >
        <Row
          label="Net Cash / Bank Amount"
          value={netBank}
          emphasize
          onAccent={vibrant}
        />
      </div>
      {partyKind !== "OTHER_LEDGER" ? (
        <>
          <Row label="Total Allocated" value={totalAllocated} vibrant={vibrant} />
          {partyKind === "CUSTOMER" ? (
            <Row label="Customer Advance / Unallocated" value={advance} vibrant={vibrant} />
          ) : null}
        </>
      ) : null}
      {partyKind === "CUSTOMER" ? (
        <p
          className={cn(
            "text-[11px] pt-1",
            vibrant ? "text-brand-800/70" : "text-muted-foreground",
          )}
        >
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
  vibrant,
  onAccent,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  vibrant?: boolean;
  onAccent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span
        className={cn(
          onAccent ? "text-white/85" : vibrant ? "text-navy-700" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums font-medium",
          onAccent
            ? "text-white font-bold text-sm"
            : emphasize
              ? "text-brand-700 font-semibold"
              : vibrant
                ? "text-navy-900"
                : undefined,
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
