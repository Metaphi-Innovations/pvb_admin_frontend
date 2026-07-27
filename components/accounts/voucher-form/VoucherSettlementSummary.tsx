"use client";

import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export interface VoucherSettlementSummaryProps {
  grossAmount: number;
  adjustmentsTotal: number;
  netCashBankAmount: number;
  allocatedAmount: number;
  unallocatedOrAdvanceAmount: number;
  /** payment | receipt labels */
  variant?: "payment" | "receipt";
  className?: string;
}

/** Compact settlement totals for Payment / Receipt vouchers. */
export function VoucherSettlementSummary({
  grossAmount,
  adjustmentsTotal,
  netCashBankAmount,
  allocatedAmount,
  unallocatedOrAdvanceAmount,
  variant = "payment",
  className,
}: VoucherSettlementSummaryProps) {
  const netLabel =
    variant === "payment" ? "Net Cash / Bank Amount" : "Net Cash / Bank Amount";

  return (
    <div
      className={cn(
        "mt-2 rounded-md border border-border/40 bg-muted/15 px-2.5 py-1.5 space-y-0.5 max-w-md",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {variant === "payment" ? "Payment Settlement" : "Receipt Settlement"}
      </p>
      <SummaryRow label="Gross Amount" value={grossAmount} />
      <SummaryRow label="Adjustments" value={adjustmentsTotal} muted />
      <SummaryRow label={netLabel} value={netCashBankAmount} emphasize />
      <div className="border-t border-border/40 pt-1 mt-0.5 space-y-1">
        <SummaryRow label="Allocated Amount" value={allocatedAmount} />
        <SummaryRow
          label="Unallocated / Advance"
          value={unallocatedOrAdvanceAmount}
          muted
        />
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  emphasize,
}: {
  label: string;
  value: number;
  muted?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-[12px]">
      <span
        className={cn(
          muted && "text-muted-foreground",
          emphasize && "font-medium text-foreground",
          !muted && !emphasize && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          emphasize ? "font-semibold text-foreground" : "font-medium text-foreground",
        )}
      >
        {formatMoney(value)}
      </span>
    </div>
  );
}
