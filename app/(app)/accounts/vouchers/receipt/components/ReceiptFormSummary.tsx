"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { cn } from "@/lib/utils";

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div
      className={
        strong
          ? "flex items-center justify-between gap-4 py-1.5 border-t border-border/60"
          : "flex items-center justify-between gap-4 py-0.5"
      }
    >
      <span className={strong ? "so-grand-total-label" : "so-summary-label"}>{label}</span>
      <span className={strong ? "so-grand-total-value tabular-nums" : "so-summary-value tabular-nums"}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

/**
 * Receipt Amount Summary — visual mirror of Credit Note / Debit Note summary card.
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
  footerSlot,
}: {
  grossAmount: number;
  invoiceSettlement: number;
  onAccountAmount: number;
  adjustmentsTotal: number;
  receiptAmount: number;
  showInvoiceSettlement?: boolean;
  showOnAccount?: boolean;
  balanced?: boolean;
  className?: string;
  footerSlot?: ReactNode;
}) {
  const showAdjustments = Math.abs(adjustmentsTotal) > 0.004;

  return (
    <VoucherFormSectionCard title="Amount Summary" className={cn("lg:sticky lg:top-3 lg:z-10", className)}>
      <div className="space-y-1.5 so-invoice-summary">
        {balanced ? (
          <div className="flex items-center justify-end gap-1 text-[11px] font-medium text-emerald-700 pb-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Balanced
          </div>
        ) : null}
        <SummaryRow label="Gross Amount" value={grossAmount} />
        {showInvoiceSettlement ? (
          <SummaryRow label="Invoice Settlement" value={invoiceSettlement} />
        ) : null}
        {showOnAccount ? (
          <SummaryRow label="Advance / On Account" value={onAccountAmount} />
        ) : null}
        {showAdjustments ? <SummaryRow label="Adjustments" value={adjustmentsTotal} /> : null}
        <SummaryRow label="Receipt Amount" value={receiptAmount} strong />
      </div>
      {footerSlot}
    </VoucherFormSectionCard>
  );
}
