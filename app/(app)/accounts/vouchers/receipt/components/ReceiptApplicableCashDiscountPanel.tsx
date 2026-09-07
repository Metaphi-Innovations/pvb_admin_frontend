"use client";

import { Banknote, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EligibleCashDiscountOffer } from "@/types/receipt-voucher.types";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xs font-medium",
          mono && "font-mono text-brand-700",
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}

export function ReceiptApplicableCashDiscountPanel({
  offers = [],
  totalEstimatedBenefit = 0,
  loading = false,
}: {
  offers?: EligibleCashDiscountOffer[];
  totalEstimatedBenefit?: number;
  loading?: boolean;
}) {
  if (!loading && offers.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          Cash Discount Scheme
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Applied automatically on post
        </p>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Checking eligibility…</p>
      ) : (
        <>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs text-emerald-900 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5" />
              Estimated credit note (on received settlement)
            </p>
            <p className="text-sm font-semibold tabular-nums text-emerald-800">
              {formatRupee(totalEstimatedBenefit)}
            </p>
          </div>

          <div className="space-y-2">
            {offers.map((offer) => (
              <div
                key={`${offer.open_item_id}-${offer.scheme_id}`}
                className="rounded-lg border border-brand-100 bg-brand-50/40 p-3 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">
                    <span className="font-mono text-brand-700">
                      {offer.scheme_code}
                    </span>
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    {offer.scheme_name}
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                    Auto
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <Field
                    label="Invoice"
                    value={offer.invoice_number}
                    mono
                  />
                  <Field
                    label="Received"
                    value={formatRupee(offer.allocated_amount)}
                  />
                  <Field
                    label="Payment days"
                    value={`${offer.payment_days} day${
                      offer.payment_days === 1 ? "" : "s"
                    }`}
                  />
                  <Field
                    label="Discount"
                    value={
                      String(offer.discount_type).toLowerCase() === "percentage"
                        ? `${offer.discount_value}%`
                        : formatRupee(offer.discount_value)
                    }
                  />
                  <Field
                    label="Est. benefit"
                    value={formatRupee(offer.estimated_benefit_amount)}
                  />
                </div>
                {offer.summary ? (
                  <p className="text-[11px] text-muted-foreground">
                    {offer.summary}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
