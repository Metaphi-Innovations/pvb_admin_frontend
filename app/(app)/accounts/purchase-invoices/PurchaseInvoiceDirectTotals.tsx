"use client";



import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";

import { formatMoney } from "@/lib/accounts/money-format";

import type { DirectPurchaseTotals } from "./purchase-invoice-direct-utils";

import { DP_FIELD_CLASS } from "./direct-purchase-form-ui";

import { cn } from "@/lib/utils";



function SummaryRow({ label, value }: { label: string; value: string }) {

  return (

    <div className="flex items-center justify-between gap-6 py-0.5 text-xs text-foreground">

      <span className="text-muted-foreground">{label}</span>

      <span className="tabular-nums font-medium">{value}</span>

    </div>

  );

}



export function PurchaseInvoiceDirectTotals({

  totals,

  roundingAdjustment,

  onRoundingChange,

  readOnly,

}: {

  totals: DirectPurchaseTotals;

  roundingAdjustment: number;

  onRoundingChange?: (v: number) => void;

  readOnly?: boolean;

}) {

  const tdsDisplay =

    totals.tdsDeduction > 0 ? `− ${formatMoney(totals.tdsDeduction)}` : formatMoney(0);



  return (

    <div className="w-full max-w-[300px] text-xs">

      <SummaryRow label="Gross Amount" value={formatMoney(totals.grossAmount)} />

      <SummaryRow label="Discount" value={formatMoney(totals.discountTotal)} />

      <SummaryRow label="Taxable Amount" value={formatMoney(totals.taxableAmount)} />

      <SummaryRow label="CGST" value={formatMoney(totals.cgst)} />

      <SummaryRow label="SGST" value={formatMoney(totals.sgst)} />

      <SummaryRow label="IGST" value={formatMoney(totals.igst)} />

      <SummaryRow label="Total GST" value={formatMoney(totals.totalGst)} />

      <SummaryRow label="TDS" value={tdsDisplay} />

      {!readOnly && onRoundingChange ? (

        <div className="flex items-center justify-between gap-3 py-0.5">

          <span className="text-muted-foreground">Round Off</span>

          <AccountsMoneyInput

            className={cn(DP_FIELD_CLASS, "text-right w-24 h-7 text-xs")}

            value={roundingAdjustment}

            onChange={onRoundingChange}

          />

        </div>

      ) : (

        <SummaryRow label="Round Off" value={formatMoney(roundingAdjustment)} />

      )}

      <div className="border-t border-border my-1.5" />

      <div className="flex items-center justify-between gap-6 py-0.5 text-[13px] font-semibold text-foreground">

        <span>Net Payable</span>

        <span className="tabular-nums">{formatMoney(totals.netPayable)}</span>

      </div>

    </div>

  );

}


