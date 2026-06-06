"use client";

import { cn } from "@/lib/utils";
import { getBalanceAmount, type CompanyPaymentRecord } from "../payments-data";
import { formatINR } from "../payment-utils";

export function PaymentAmountSummary({
  record,
  compact = false,
  className,
}: {
  record: CompanyPaymentRecord;
  compact?: boolean;
  className?: string;
}) {
  const rejected = Math.max(0, record.claimedAmount - record.approvedAmount);
  const balance = getBalanceAmount(record);

  const rows = [
    { label: "Claimed Amount", value: record.claimedAmount, className: "text-brand-700" },
    { label: "Approved Amount", value: record.approvedAmount, className: "text-emerald-700" },
    {
      label: "Rejected / Deducted",
      value: rejected,
      className: "text-amber-800",
      hide: rejected <= 0 && compact,
    },
    { label: "Paid Amount", value: record.paidAmount, className: "text-foreground" },
    {
      label: "Balance Amount",
      value: balance,
      className: balance > 0 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold",
    },
  ].filter((r) => !r.hide);

  if (compact) {
    return (
      <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs", className)}>
        {rows.map((row) => (
          <div key={row.label}>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <p className={cn("font-semibold tabular-nums mt-0.5", row.className)}>{formatINR(row.value)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-border/60 bg-muted/10 p-4 space-y-2", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{row.label}</span>
          <span className={cn("font-semibold tabular-nums", row.className)}>{formatINR(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
