"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export function PaymentSummaryCard({
  gross,
  totalAllocated,
  advance,
  tds,
  discount,
  otherDebit,
  otherCredit,
  roundOff,
  netBank,
  partyKind,
  className,
}: {
  gross: number;
  totalAllocated: number;
  advance: number;
  tds: number;
  discount: number;
  otherDebit: number;
  otherCredit: number;
  roundOff: number;
  netBank: number;
  partyKind: string;
  className?: string;
}) {
  const showAlloc = partyKind !== "OTHER_LEDGER";
  const showAdvance = partyKind === "SUPPLIER" && advance > 0;
  const otherNet = otherCredit - otherDebit;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-muted/15 px-3.5 py-3 space-y-1.5 w-full max-w-[360px]",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Payment Summary
      </p>
      <Row
        label={
          partyKind === "SUPPLIER"
            ? "Gross Supplier Settlement"
            : partyKind === "CUSTOMER_REFUND"
              ? "Gross Refund Amount"
              : "Gross Amount"
        }
        value={gross}
      />
      {showAlloc ? <Row label="Allocated Amount" value={totalAllocated} /> : null}
      {showAdvance ? <Row label="Supplier Advance / On Account" value={advance} /> : null}
      {tds > 0 ? <Row label="Supplier TDS" value={tds} /> : null}
      {discount > 0 ? <Row label="Discount Received" value={discount} /> : null}
      {otherNet !== 0 ? <Row label="Other Adjustment" value={otherNet} /> : null}
      {roundOff !== 0 ? <Row label="Round Off" value={roundOff} /> : null}
      <Row label="Net Cash / Bank Payment" value={netBank} emphasize />
      {partyKind === "SUPPLIER" && (tds > 0 || discount > 0) ? (
        <p className="text-[11px] text-muted-foreground pt-1">
          Net paid is not the same as invoice settlement when TDS or Discount applies.
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
