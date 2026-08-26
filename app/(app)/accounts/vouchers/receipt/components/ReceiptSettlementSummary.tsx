"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export function ReceiptSettlementSummary({
  totalInvoiceSettlement,
  totalSettlementComponents,
  bankAmount,
  tdsAmount,
  advanceAmount,
  partyKind,
  isAdvance,
  className,
}: {
  /** Invoice / party settlement total (allocated or gross). */
  totalInvoiceSettlement: number;
  /** Sum of breakdown components (bank + TDS + other). */
  totalSettlementComponents: number;
  bankAmount: number;
  tdsAmount: number;
  advanceAmount?: number;
  partyKind: string;
  isAdvance?: boolean;
  className?: string;
}) {
  const difference = Math.round(
    (totalInvoiceSettlement - totalSettlementComponents) * 100,
  ) / 100;
  const balanced = Math.abs(difference) < 0.01;

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-3 space-y-2 w-full",
        balanced
          ? "border-border bg-muted/15"
          : "border-amber-300 bg-amber-50/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Settlement Summary
        </p>
        {balanced ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> Difference
          </span>
        )}
      </div>

      <Row
        label={
          isAdvance
            ? "Customer Advance"
            : partyKind === "OTHER_LEDGER"
              ? "Receipt Amount"
              : partyKind === "SUPPLIER_REFUND"
                ? "Total Refund Settlement"
                : "Total Invoice Settlement"
        }
        value={totalInvoiceSettlement}
      />
      <Row label="Bank / Cash Received" value={Math.max(0, bankAmount)} muted />
      {tdsAmount > 0 ? (
        <Row label="TDS Receivable" value={tdsAmount} muted />
      ) : null}
      <Row
        label="Total Settlement Breakdown"
        value={totalSettlementComponents}
        emphasize
      />

      <div
        className={cn(
          "mt-1 rounded-lg px-2.5 py-2 flex items-center justify-between gap-3",
          balanced ? "bg-emerald-50 border border-emerald-100" : "bg-amber-100/80 border border-amber-200",
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold",
            balanced ? "text-emerald-800" : "text-amber-900",
          )}
        >
          Difference
        </span>
        <span
          className={cn(
            "text-sm tabular-nums font-bold",
            balanced ? "text-emerald-800" : "text-amber-900",
          )}
        >
          {formatMoney(difference)}
        </span>
      </div>

      {!balanced ? (
        <p className="text-[11px] text-amber-800 leading-snug">
          Invoice settlement and breakdown components should match. Adjust settlement
          amounts, TDS, or other components until the difference is ₹0.
        </p>
      ) : null}

      {partyKind === "CUSTOMER" && !isAdvance && (advanceAmount ?? 0) > 0 ? (
        <p className="text-[11px] text-muted-foreground pt-0.5">
          Unallocated / Advance portion: {formatMoney(advanceAmount ?? 0)}
        </p>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  emphasize,
  muted,
}: {
  label: string;
  value: number;
  emphasize?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={cn(muted ? "text-muted-foreground" : "text-foreground")}>
        {label}
      </span>
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
