"use client";

import React from "react";
import {
  formatBatchExpiryDate,
  formatWarehouseWithState,
  type NearExpiryStockBatch,
} from "../product-near-expiry-scheme";

interface NearExpiryStockBatchTableProps {
  batches: NearExpiryStockBatch[];
  withinDays: number;
  selectedProductIds?: string[];
}

export function NearExpiryStockBatchTable({
  batches,
  withinDays,
  selectedProductIds = [],
}: NearExpiryStockBatchTableProps) {
  if (withinDays <= 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-3 text-[11px] text-muted-foreground">
        Enter <strong>Expiry Within</strong> days to view available near-expiry stock batches from
        QC-passed inventory.
      </div>
    );
  }

  const visibleBatches =
    selectedProductIds.length > 0
      ? batches.filter((batch) => selectedProductIds.includes(batch.productId))
      : batches;

  if (visibleBatches.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-[11px] text-amber-800">
        {selectedProductIds.length > 0
          ? "Selected products have no QC-passed batches expiring within the configured window."
          : `No QC-passed stock batches are expiring within ${withinDays} days. Try increasing Expiry Within or check Stock Overview.`}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-white">
      <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold">
        Near-Expiry Stock Available (within {withinDays} days)
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/20 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-semibold">Product</th>
              <th className="px-2 py-1.5 text-left font-semibold">Batch</th>
              <th className="px-2 py-1.5 text-left font-semibold">Warehouse · State</th>
              <th className="px-2 py-1.5 text-right font-semibold">Available Qty</th>
              <th className="px-2 py-1.5 text-left font-semibold">Expiry Date</th>
              <th className="px-2 py-1.5 text-right font-semibold">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {visibleBatches.map((batch) => (
              <tr key={batch.id} className="border-b border-border/70 hover:bg-muted/10">
                <td className="px-2 py-1.5">
                  <div className="font-medium text-foreground">{batch.productName}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{batch.sku || batch.productCode}</div>
                </td>
                <td className="px-2 py-1.5 font-mono text-[11px]">{batch.batchNumber}</td>
                <td className="px-2 py-1.5">{batch.warehouseLabel || formatWarehouseWithState(batch.warehouse)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{batch.availableQty}</td>
                <td className="px-2 py-1.5">{formatBatchExpiryDate(batch.expiryDate)}</td>
                <td className="px-2 py-1.5 text-right">
                  <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                    {batch.daysToExpiry}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
