"use client";

import { cn } from "@/lib/utils";
import {
  getPendingPaymentAmount,
  getRejectedAmount,
  type AccountPaymentRecord,
} from "../accounts-payment-data";
import { formatINR } from "../expense-utils";

export function PaymentAmountBreakdown({
  record,
  compact = false,
  className,
}: {
  record: AccountPaymentRecord;
  compact?: boolean;
  className?: string;
}) {
  const rejected = getRejectedAmount(record);
  const pending = getPendingPaymentAmount(record);

  const rows = [
    { label: "Claimed Amount", value: record.claimedAmount, className: "text-brand-700" },
    { label: "Approved Amount", value: record.approvedAmount, className: "text-emerald-700" },
    {
      label: "Rejected / Deducted Amount",
      value: rejected,
      className: rejected > 0 ? "text-amber-800" : "text-muted-foreground",
      hide: rejected <= 0 && compact,
    },
    { label: "Paid Amount", value: record.paidAmount, className: "text-foreground" },
    {
      label: "Pending Payment Amount",
      value: pending,
      className: pending > 0 ? "text-amber-700 font-semibold" : "text-emerald-700 font-semibold",
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
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-gradient-to-br from-muted/20 to-white p-4 space-y-2",
        className,
      )}
    >
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{row.label}</span>
          <span className={cn("font-semibold tabular-nums", row.className)}>{formatINR(row.value)}</span>
        </div>
      ))}
    </div>
  );
}
