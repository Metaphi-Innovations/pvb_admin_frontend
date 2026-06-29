"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import {
  formatBatchExpiryDate,
  formatNearExpiryBenefitLabel,
  NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
  NEAR_EXPIRY_SETTLEMENT_METHOD,
  NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
  NEAR_EXPIRY_SETTLEMENT_TOOLTIP,
} from "../near-expiry-dispatch";
import { formatSchemeRupee } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import type { DispatchNearExpirySchemeEntry } from "../types";

interface NearExpirySchemeInfoPanelProps {
  entries: DispatchNearExpirySchemeEntry[];
}

export function NearExpirySchemeInfoPanel({ entries }: NearExpirySchemeInfoPanelProps) {
  if (!entries.length) return null;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/30 p-5 shadow-sm">
      <h2 className="mb-4 flex items-center gap-1.5 border-b border-orange-200 pb-2 text-xs font-bold uppercase tracking-wider text-orange-900">
        <Sparkles className="h-4 w-4 text-orange-600" />
        Scheme Information
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-orange-100 bg-white/60">
              {[
                "Scheme Code",
                "Scheme Name",
                "Type",
                "Scheme Status",
                "Product",
                "Batch",
                "Expiry",
                "Days Left",
                "Benefit",
                "Est. Benefit",
                "Settlement Method",
                "Settlement Status",
              ].map((header) => (
                <th
                  key={header}
                  className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={`${entry.schemeCode}-${entry.batchNumber}-${index}`}
                className="border-b border-orange-100/80 hover:bg-white/50"
              >
                <td className="px-2 py-2.5 text-xs font-mono font-bold text-brand-700">
                  {entry.schemeCode}
                </td>
                <td className="px-2 py-2.5 text-xs font-semibold">{entry.schemeName}</td>
                <td className="px-2 py-2.5 text-xs">{entry.schemeType}</td>
                <td className="px-2 py-2.5 text-xs font-semibold text-emerald-700">
                  {entry.schemeStatus ?? NEAR_EXPIRY_SCHEME_STATUS_ACTIVE}
                </td>
                <td className="px-2 py-2.5 text-xs font-semibold">{entry.product}</td>
                <td className="px-2 py-2.5 text-xs font-mono">{entry.batchNumber}</td>
                <td className="px-2 py-2.5 text-xs">
                  {formatBatchExpiryDate(entry.batchExpiryDate)}
                </td>
                <td className="px-2 py-2.5 text-center text-xs font-bold text-orange-700">
                  {entry.remainingExpiryDays}
                </td>
                <td className="px-2 py-2.5 text-xs">
                  {formatNearExpiryBenefitLabel(
                    entry.benefitType as "Percentage" | "Fixed Amount",
                    entry.benefitValue,
                  )}
                </td>
                <td className="px-2 py-2.5 text-xs font-bold text-orange-800">
                  {formatSchemeRupee(entry.estimatedBenefitAmount)}
                </td>
                <td className="px-2 py-2.5 text-xs">
                  {entry.settlementMethod ?? entry.settlement ?? NEAR_EXPIRY_SETTLEMENT_METHOD}
                </td>
                <td className="px-2 py-2.5">
                  <span className="inline-flex rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    {entry.settlementStatus ?? entry.status ?? NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">
        {NEAR_EXPIRY_SETTLEMENT_TOOLTIP} Scheme benefit is recorded for settlement only. Selling price,
        invoice value, GST, and taxable amounts are not modified.
      </p>
    </div>
  );
}
