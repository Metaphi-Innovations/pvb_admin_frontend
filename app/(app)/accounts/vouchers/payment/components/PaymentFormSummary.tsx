"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/accounts/money-format";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import { cn } from "@/lib/utils";
import type { PaymentPartyKind } from "@/types/payment-voucher.types";

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
 * Payment Amount Summary — visual mirror of Receipt / Credit Note summary card.
 */
export function PaymentFormSummary({
  grossAmount,
  invoiceSettlement,
  advanceAmount,
  adjustmentsTotal,
  paymentAmount,
  partyKind,
  showInvoiceSettlement = false,
  showAdvance = false,
  balanced,
  className,
  footerSlot,
}: {
  grossAmount: number;
  invoiceSettlement: number;
  advanceAmount: number;
  adjustmentsTotal: number;
  paymentAmount: number;
  partyKind: PaymentPartyKind;
  showInvoiceSettlement?: boolean;
  showAdvance?: boolean;
  balanced?: boolean;
  className?: string;
  footerSlot?: ReactNode;
}) {
  const showAdjustments = Math.abs(adjustmentsTotal) > 0.004;
  const settlementLabel =
    partyKind === "CUSTOMER_REFUND" ? "Refund Settlement" : "Invoice Settlement";
  const advanceLabel = "Supplier Advance";

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
          <SummaryRow label={settlementLabel} value={invoiceSettlement} />
        ) : null}
        {showAdvance ? <SummaryRow label={advanceLabel} value={advanceAmount} /> : null}
        {showAdjustments ? <SummaryRow label="Adjustments" value={adjustmentsTotal} /> : null}
        <SummaryRow label="Payment Amount" value={paymentAmount} strong />
      </div>
      {footerSlot}
    </VoucherFormSectionCard>
  );
}
