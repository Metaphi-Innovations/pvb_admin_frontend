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

export function JournalFormSummary({
  debitAccount,
  creditAccount,
  journalAmount,
  balanced,
  className,
}: {
  debitAccount: string;
  creditAccount: string;
  journalAmount: number;
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
        <SummaryRow label="Debit Account" value={debitAccount} />
        <SummaryRow label="Credit Account" value={creditAccount} />
        <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
          <span className="so-grand-total-label">Journal Amount</span>
          <span className="so-grand-total-value tabular-nums">
            {journalAmount > 0 ? formatMoney(journalAmount) : "—"}
          </span>
        </div>
      </div>
    </VoucherFormSectionCard>
  );
}
