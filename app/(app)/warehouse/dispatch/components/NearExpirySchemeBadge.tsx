"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatBatchExpiryDate,
  formatNearExpiryBenefitLabel,
  NEAR_EXPIRY_ELIGIBLE_LABEL,
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
} from "../near-expiry-dispatch";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import type { DispatchNearExpirySchemeEntry } from "../types";

interface NearExpirySchemeBadgeProps {
  entries: DispatchNearExpirySchemeEntry[];
  className?: string;
}

export function NearExpirySchemeBadge({ entries, className = "" }: NearExpirySchemeBadgeProps) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700 hover:bg-orange-100 ${className}`}
      >
        <span aria-hidden>🟠</span> {NEAR_EXPIRY_ELIGIBLE_LABEL}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Near Expiry Scheme Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {entries.map((entry, index) => (
              <div
                key={`${entry.schemeCode}-${entry.batchNumber}-${index}`}
                className="rounded-lg border border-orange-100 bg-orange-50/40 p-3 space-y-2"
              >
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <Detail label="Scheme Code" value={entry.schemeCode} mono />
                  <Detail label="Scheme Name" value={entry.schemeName} />
                  <Detail label="Product" value={entry.product} />
                  <Detail label="Batch Number" value={entry.batchNumber} mono />
                  <Detail label="Expiry Date" value={formatBatchExpiryDate(entry.batchExpiryDate)} />
                  <Detail label="Remaining Days" value={`${entry.remainingExpiryDays} days`} />
                  <Detail
                    label="Benefit Type"
                    value={entry.benefitType === "Fixed Amount" ? "Fixed Amount" : "Percentage"}
                  />
                  <Detail
                    label="Benefit Value"
                    value={formatNearExpiryBenefitLabel(
                      entry.benefitType as "Percentage" | "Fixed Amount",
                      entry.benefitValue,
                    )}
                  />
                  <Detail
                    label="Estimated Benefit Amount"
                    value={formatSchemeRupee(entry.estimatedBenefitAmount)}
                    highlight
                  />
                  <Detail label="Scheme Status" value={entry.schemeStatus ?? NEAR_EXPIRY_SCHEME_STATUS_ACTIVE} />
                  <Detail label="Settlement Status" value={entry.settlementStatus ?? NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING} />
                  <Detail
                    label="Settlement Method"
                    value={entry.settlementMethod ?? entry.settlement ?? NEAR_EXPIRY_SETTLEMENT_METHOD}
                  />
                  <Detail label="Financial Settlement" value={NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL} />
                  <Detail label="Qty" value={String(entry.dispatchQuantity)} />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Detail({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 font-bold ${mono ? "font-mono text-brand-700" : "text-foreground"} ${
          highlight ? "text-orange-700" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
