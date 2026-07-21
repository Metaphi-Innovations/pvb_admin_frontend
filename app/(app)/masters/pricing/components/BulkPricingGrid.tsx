"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import {
  formatIndianRupeeDisplay,
  getPricingProductLineInlineErrors,
  type BulkPricingLine,
} from "../pricing-data";
import { pricingInput } from "./pricing-form-styles";

interface BulkPricingGridProps {
  lines: BulkPricingLine[];
  onChange: (lines: BulkPricingLine[]) => void;
  errors: Record<string, string>;
  onRemoveLine?: (productId: number) => void;
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

const READ_ONLY_HEADERS = [
  "Product Code",
  "Product Name",
  "Supplier Name",
  "Supplier Code",
  "HSN Code",
  "Category",
  "Segment",
  "Pack Size",
  "Unit",
  "GST %",
  "MRP",
  "Cost Price",
  "Dealer Price",
] as const;

function PriceFieldCell({
  value,
  onChange,
  error,
  highlight,
}: {
  value: number;
  onChange: (value: number) => void;
  error?: string;
  highlight?: boolean;
}) {
  return (
    <div className="w-[6.75rem] shrink-0">
      <IndianRupeeInput
        value={value}
        onChange={onChange}
        className={cn(
          pricingInput("h-7 w-[6.75rem] max-w-[6.75rem] px-2 text-xs"),
          highlight && "ring-1 ring-brand-200/80",
          error && "border-red-400 ring-1 ring-red-300",
        )}
      />
      {error && (
        <p className="mt-0.5 max-w-[6.75rem] text-[10px] leading-tight text-red-600">{error}</p>
      )}
    </div>
  );
}

export function BulkPricingGrid({ lines, onChange, errors, onRemoveLine }: BulkPricingGridProps) {
  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white py-6 text-center">
        <p className="text-xs text-muted-foreground">
          No products selected — search and select products above to build the pricing grid.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] border-collapse text-xs">
          <thead>
            <tr className="master-listing-thead-row">
              {READ_ONLY_HEADERS.map((header) => (
                <th
                  key={header}
                  className={cn(
                    "whitespace-nowrap px-2 py-2 text-left text-xs font-semibold text-foreground",
                    (header === "MRP" || header === "Cost Price" || header === "Dealer Price") &&
                      "text-right",
                  )}
                >
                  {header}
                </th>
              ))}
              {onRemoveLine && (
                <th className="master-listing-th-sticky w-12 px-2 py-2 text-right text-xs font-semibold text-foreground">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const inlineErrors = getPricingProductLineInlineErrors(line);
              const mrpError = inlineErrors.mrp || errors[`line_${idx}_mrp`];
              const dealerPriceError =
                inlineErrors.dealerPrice || errors[`line_${idx}_dealerPrice`];

              return (
                <tr key={line.id} className="master-listing-row group">
                  <td className="px-2 py-1.5 font-mono text-[11px]">{line.productCode || "—"}</td>
                  <td className="max-w-[140px] truncate px-2 py-1.5">{line.productName}</td>
                  <td className="max-w-[120px] truncate px-2 py-1.5">{line.supplierName || "—"}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px]">{line.supplierCode || "—"}</td>
                  <td className="px-2 py-1.5">{line.hsnCode || "—"}</td>
                  <td className="px-2 py-1.5">{line.category || "—"}</td>
                  <td className="px-2 py-1.5">{line.segment || "—"}</td>
                  <td className="px-2 py-1.5">{line.packSize || "—"}</td>
                  <td className="px-2 py-1.5">{line.unit || line.mou || line.baseUnit || "—"}</td>
                  <td className="px-2 py-1.5">{line.gstPct || "—"}</td>
                  <td className="px-2 py-1.5 align-top text-right">
                    <div className="inline-block text-right">
                      <p
                        className={cn(
                          "tabular-nums font-medium",
                          mrpError ? "text-red-600" : "text-muted-foreground",
                        )}
                      >
                        {formatIndianRupeeDisplay(line.mrp)}
                      </p>
                      {mrpError && (
                        <p className="mt-0.5 max-w-[8rem] text-[10px] leading-tight text-red-600">
                          {mrpError}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 align-top text-right">
                    <span className="inline-block tabular-nums text-muted-foreground">
                      {formatIndianRupeeDisplay(line.costPrice)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 align-top text-right">
                    <PriceFieldCell
                      value={line.dealerPrice}
                      onChange={(v) => onChange(updateLine(lines, idx, { dealerPrice: v }))}
                      error={dealerPriceError}
                      highlight
                    />
                  </td>
                  {onRemoveLine && (
                    <td className="px-2 py-1.5 text-right align-top">
                      <button
                        type="button"
                        onClick={() => onRemoveLine(line.id)}
                        className="rounded-md p-1.5 text-red-600 transition-colors hover:bg-red-50"
                        title="Remove product"
                        aria-label={`Remove ${line.productName}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {errors.productLines && (
        <p className="border-t border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {errors.productLines}
        </p>
      )}
    </div>
  );
}
