"use client";

import { AutoRoundOffDisplay } from "@/components/accounts/voucher-form/AutoRoundOffDisplay";
import { formatMoney } from "@/lib/accounts/money-format";
import type { DirectPurchaseTotals } from "./purchase-invoice-direct-utils";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="so-summary-label text-muted-foreground">{label}</span>
      <span className="so-summary-value tabular-nums font-medium">{value}</span>
    </div>
  );
}

export function PurchaseInvoiceDirectTotals({
  totals,
  roundingAdjustment,
  additionalChargeTotal = 0,
}: {
  totals: DirectPurchaseTotals;
  roundingAdjustment: number;
  additionalChargeTotal?: number;
}) {
  return (
    <div className="w-full space-y-1.5 so-invoice-summary text-xs">
      <SummaryRow label="Gross Amount" value={formatMoney(totals.grossAmount)} />
      <SummaryRow label="Discount" value={formatMoney(totals.discountTotal)} />
      <SummaryRow label="Taxable Amount" value={formatMoney(totals.taxableAmount)} />
      <SummaryRow label="CGST" value={formatMoney(totals.cgst)} />
      <SummaryRow label="SGST" value={formatMoney(totals.sgst)} />
      <SummaryRow label="IGST" value={formatMoney(totals.igst)} />
      <SummaryRow label="Total GST" value={formatMoney(totals.totalGst)} />
      <SummaryRow label="Additional Charges" value={formatMoney(additionalChargeTotal)} />
      <div className="flex items-center justify-between gap-4 py-0.5">
        <span className="so-summary-label text-muted-foreground">Round Off</span>
        <AutoRoundOffDisplay value={roundingAdjustment} />
      </div>
      <div className="flex items-center justify-between gap-4 py-1.5 border-t border-border/60">
        <span className="so-grand-total-label font-semibold">Net Payable</span>
        <span className="so-grand-total-value tabular-nums font-semibold">
          {formatMoney(totals.netPayable)}
        </span>
      </div>
    </div>
  );
}
