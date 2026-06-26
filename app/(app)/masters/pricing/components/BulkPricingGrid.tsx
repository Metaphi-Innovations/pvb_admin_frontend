"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { ListingStatusToggle } from "@/components/listing";
import { formatIndianRupeeDisplay, type BulkPricingLine } from "../pricing-data";
import { pricingInput } from "./pricing-form-styles";
import type { MasterStatus } from "@/lib/masters/common";

interface BulkPricingGridProps {
  lines: BulkPricingLine[];
  onChange: (lines: BulkPricingLine[]) => void;
  errors: Record<string, string>;
}

function updateLine(
  lines: BulkPricingLine[],
  index: number,
  patch: Partial<BulkPricingLine>,
): BulkPricingLine[] {
  return lines.map((line, i) => {
    if (i !== index) return line;
    const next = { ...line, ...patch };
    next.netSellingPrice = next.dealerPrice;
    return next;
  });
}

export function BulkPricingGrid({ lines, onChange, errors }: BulkPricingGridProps) {
  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">
          No products selected — use the options above to add products to the pricing grid.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                "Product Code",
                "Product Name",
                "SKU",
                "Category",
                "Segment",
                "Pack Size",
                "HSN",
                "GST %",
                "Cost Price",
                "Dealer Price",
                "MRP",
                "Status",
              ].map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap px-2 py-2 text-left font-semibold text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => (
              <tr
                key={line.id}
                className="border-b border-border/60 last:border-0 transition-colors hover:bg-brand-50/30"
              >
                <td className="px-2 py-1.5 font-mono text-[11px]">{line.productCode}</td>
                <td className="max-w-[140px] truncate px-2 py-1.5">{line.productName}</td>
                <td className="px-2 py-1.5 font-mono text-[11px]">{line.sku}</td>
                <td className="px-2 py-1.5">{line.category}</td>
                <td className="px-2 py-1.5">{line.segment}</td>
                <td className="px-2 py-1.5">{line.packSize || "—"}</td>
                <td className="px-2 py-1.5">{line.hsnCode}</td>
                <td className="px-2 py-1.5">{line.gstPct}</td>
                <td className="px-2 py-1.5">
                  <IndianRupeeInput
                    value={line.costPrice}
                    onChange={(v) => onChange(updateLine(lines, idx, { costPrice: v }))}
                    className={cn(
                      pricingInput("h-7 min-w-[90px]"),
                      errors[`bulk_${idx}_costPrice`] && "border-red-400 ring-1 ring-red-300",
                    )}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <IndianRupeeInput
                    value={line.dealerPrice}
                    onChange={(v) => onChange(updateLine(lines, idx, { dealerPrice: v }))}
                    className={cn(
                      pricingInput("h-7 min-w-[90px] ring-1 ring-brand-200/80"),
                      errors[`bulk_${idx}_dealerPrice`] && "border-red-400 ring-1 ring-red-300",
                    )}
                  />
                </td>
                <td className="px-2 py-1.5 text-right text-muted-foreground">
                  {formatIndianRupeeDisplay(line.mrp)}
                </td>
                <td className="px-2 py-1.5">
                  <ListingStatusToggle
                    active={line.status === "active"}
                    onChange={() =>
                      onChange(
                        updateLine(lines, idx, {
                          status: (line.status === "active" ? "inactive" : "active") as MasterStatus,
                        }),
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errors.bulkLines && (
        <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errors.bulkLines}
        </p>
      )}
    </div>
  );
}
