"use client";

import React from "react";
import { formatCurrency } from "@/lib/procurement/utils";
import type { EnrichedProductLine } from "@/lib/procurement/procurement-line-utils";

export function ProductInfoStrip({ info }: { info: EnrichedProductLine | null }) {
  if (!info?.productId) return null;
  const rows = [
    { label: "Product", value: info.productName },
    { label: "SKU", value: info.sku || "—", mono: true },
    { label: "Segment", value: info.segment || "—" },
    { label: "Category", value: info.category || "—" },
    { label: "Base Unit", value: info.baseUnit },
    { label: "Packaging Unit", value: info.packagingUnit },
    { label: "Conversion Qty", value: String(info.conversionQty) },
    { label: "Current MRP", value: formatCurrency(info.mrp) },
  ];
  return (
    <div className="mt-2 rounded-lg border border-brand-100 bg-brand-50/40 p-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">Product Information</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="min-w-0">
            <p className="text-[10px] text-muted-foreground">{r.label}</p>
            <p className={`truncate text-[11px] font-medium text-foreground ${r.mono ? "font-mono" : ""}`}>
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
