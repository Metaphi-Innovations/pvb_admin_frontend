"use client";

import React from "react";
import {
  getUtilizationBySchemeId,
  getUtilizationSummaryBySchemeId,
  type SchemeUtilizationRecord,
} from "../scheme-utilization-data";
import { formatSchemeRupee } from "../product-discount-scheme";

function formatRupee(value: number): string {
  return `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export default function ProductSchemeUtilizationSection({ schemeId }: { schemeId: number }) {
  const records = getUtilizationBySchemeId(schemeId);
  const summary = getUtilizationSummaryBySchemeId(schemeId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Total Orders Used" value={String(summary.totalOrdersUsed)} />
        <SummaryCard label="Total Quantity" value={String(summary.totalQuantity)} />
        <SummaryCard
          label="Total Discount Given"
          value={formatRupee(summary.totalDiscountGiven)}
        />
        <SummaryCard
          label="Total Sales After Scheme"
          value={formatRupee(summary.totalSalesValueAfterScheme)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-white">
        <div className="border-b border-border bg-muted/30 px-3 py-2 text-xs font-semibold">
          Utilization
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Sales Order No.</th>
                <th className="px-3 py-2 text-left font-semibold">Customer</th>
                <th className="px-3 py-2 text-left font-semibold">Product</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Dealer Price</th>
                <th className="px-3 py-2 text-right font-semibold">Discount Amt</th>
                <th className="px-3 py-2 text-right font-semibold">Final Rate</th>
                <th className="px-3 py-2 text-left font-semibold">Order Date</th>
                <th className="px-3 py-2 text-left font-semibold">Applied By</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    No utilization recorded yet.
                  </td>
                </tr>
              ) : (
                records.map((record: SchemeUtilizationRecord) => (
                  <tr key={record.id} className="border-b border-border/70 hover:bg-muted/10">
                    <td className="px-3 py-2 font-mono text-[11px]">{record.salesOrderNumber}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{record.customerName}</p>
                      <p className="text-[10px] text-muted-foreground">{record.customerCode}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="font-medium">{record.productName}</p>
                      <p className="text-[10px] font-mono text-brand-700">{record.productCode}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{record.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatSchemeRupee(record.dealerPrice)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatSchemeRupee(record.discountAmount)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-emerald-700">
                      {formatSchemeRupee(record.finalRate)}
                    </td>
                    <td className="px-3 py-2">{record.orderDate}</td>
                    <td className="px-3 py-2">{record.appliedBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
