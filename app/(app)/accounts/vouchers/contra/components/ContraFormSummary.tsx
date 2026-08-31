"use client";

import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { cn } from "@/lib/utils";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <span className="so-summary-label shrink-0">{label}</span>
      <span className="so-summary-value text-right break-words min-w-0">{value || "—"}</span>
    </div>
  );
}

export function ContraFormSummary({
  fromAccount,
  toAccount,
  transferAmount,
  branchContext,
  balanced,
  className,
}: {
  fromAccount: string;
  toAccount: string;
  transferAmount: number;
  branchContext?: string;
  balanced?: boolean;
  className?: string;
}) {
  return (
    <VoucherFormSectionCard title="Amount Summary" className={cn("lg:sticky lg:top-3 lg:z-10", className)}>
      <div className="space-y-1.5 so-invoice-summary">
        {balanced ? (
          <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-emerald-700 pb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
          </div>
        ) : null}
        {branchContext ? (
          <p className="text-[11px] text-muted-foreground truncate" title={branchContext}>
            {branchContext}
          </p>
        ) : null}
        <SummaryRow label="From Account" value={fromAccount} />
        <SummaryRow label="To Account" value={toAccount} />
        <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
          <span className="so-grand-total-label">Transfer Amount</span>
          <span className="so-grand-total-value tabular-nums">
            {transferAmount > 0 ? formatMoney(transferAmount) : "—"}
          </span>
        </div>
      </div>
    </VoucherFormSectionCard>
  );
}
