"use client";

import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

/**
 * Compact business-focused Receipt Summary (right column).
 * Uses existing preview totals — does not invent new formulas.
 */
export function ReceiptFormSummary({
  grossAmount,
  invoiceSettlement,
  onAccountAmount,
  adjustmentsTotal,
  receiptAmount,
  showInvoiceSettlement = false,
  showOnAccount = false,
  balanced,
  className,
}: {
  grossAmount: number;
  invoiceSettlement: number;
  onAccountAmount: number;
  /** Manual ReceiptAdjustment total (excludes bank/cash). Hide when zero. */
  adjustmentsTotal: number;
  /** Final receipt / net bank amount from existing preview. */
  receiptAmount: number;
  showInvoiceSettlement?: boolean;
  showOnAccount?: boolean;
  /** Optional soft status chip — not a manual balancing control. */
  balanced?: boolean;
  className?: string;
}) {
  const showAdjustments = Math.abs(adjustmentsTotal) > 0.004;

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

      <Row label="Gross Amount" value={grossAmount} />
      {showInvoiceSettlement ? (
        <Row label="Invoice Settlement" value={invoiceSettlement} />
      ) : null}
      {showOnAccount ? (
        <Row label="On-account Amount" value={onAccountAmount} />
      ) : null}
      {showAdjustments ? (
        <Row label="Adjustments" value={adjustmentsTotal} />
      ) : null}

      <div className="mt-1 rounded-lg bg-brand-50/80 border border-brand-100 px-2.5 py-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-brand-800">Receipt Amount</span>
        <span className="text-sm tabular-nums font-bold text-brand-800">
          {formatMoney(receiptAmount)}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium text-foreground">
        {formatMoney(value)}
      </span>
    </div>
  );
}
