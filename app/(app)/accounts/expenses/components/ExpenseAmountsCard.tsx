"use client";

import { cn } from "@/lib/utils";
import {
  getApprovedAmount,
  getClaimedAmount,
  getDeductedAmount,
  getPaidAmount,
  type AccountExpense,
} from "../expense-data";
import { formatINR } from "../expense-utils";

export function ExpenseAmountsCard({
  expense,
  compact = false,
  className,
}: {
  expense: AccountExpense;
  compact?: boolean;
  className?: string;
}) {
  const claimed = getClaimedAmount(expense);
  const approved = getApprovedAmount(expense);
  const paid = getPaidAmount(expense);
  const deducted = getDeductedAmount(expense);
  const hasApproval = expense.status === "approved" || expense.status === "paid";
  const showDeducted = hasApproval && deducted > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-gradient-to-br from-muted/20 to-white p-3",
        compact ? "grid grid-cols-3 gap-2" : "space-y-2",
        className,
      )}
    >
      <AmountBlock label="Claimed Amount" value={claimed} highlight="brand" compact={compact} />
      <AmountBlock
        label="Approved Amount"
        value={approved}
        highlight="emerald"
        compact={compact}
        muted={!hasApproval}
      />
      <AmountBlock
        label="Paid Amount"
        value={paid}
        highlight="navy"
        compact={compact}
        muted={expense.status !== "paid"}
      />
      {showDeducted && !compact && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-md px-2.5 py-1.5 col-span-full">
          <span className="font-medium">Deducted:</span> {formatINR(deducted)}{" "}
          <span className="text-muted-foreground">
            (Claimed {formatINR(claimed)} âˆ’ Approved {formatINR(approved)})
          </span>
        </p>
      )}
    </div>
  );
}

function AmountBlock({
  label,
  value,
  highlight,
  compact,
  muted,
}: {
  label: string;
  value: number;
  highlight: "brand" | "emerald" | "navy";
  compact?: boolean;
  muted?: boolean;
}) {
  const color =
    highlight === "brand"
      ? "text-brand-700"
      : highlight === "emerald"
        ? "text-emerald-700"
        : "text-navy-800";
  return (
    <div className={compact ? "" : "flex items-center justify-between gap-2"}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", compact ? "text-sm mt-0.5" : "text-base", color, muted && value === 0 && "text-muted-foreground")}>
        {formatINR(value)}
      </p>
    </div>
  );
}
