"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  batchSelectionsToAllocations,
  buildDispatchNearExpiryEntries,
  formatBatchExpiryDate,
  getActiveBatchSelection,
  getBatchSchemeStatusLabel,
  getProductBatchRows,
  NEAR_EXPIRY_ELIGIBLE_LABEL,
  selectSingleBatchAllocation,
  type BatchAllocation,
} from "../near-expiry-dispatch";
import { NearExpirySchemeBadge } from "./NearExpirySchemeBadge";

export interface BatchAllocationSectionProps {
  productName: string;
  sku: string;
  requiredQty: number;
  warehouse: string;
  customerName: string;
  selections: Record<string, number>;
  onSelectionsChange: (selections: Record<string, number>) => void;
  qtyLabel?: string;
  className?: string;
}

export function BatchAllocationSection({
  productName,
  sku,
  requiredQty,
  warehouse,
  customerName,
  selections,
  onSelectionsChange,
  qtyLabel = "Required Qty",
  className = "",
}: BatchAllocationSectionProps) {
  const batchRows = useMemo(
    () => getProductBatchRows(productName, warehouse),
    [productName, warehouse],
  );

  const batchAllocations = useMemo(
    () => batchSelectionsToAllocations(productName, warehouse, selections),
    [productName, warehouse, selections],
  );

  const schemeEntries = useMemo(() => {
    if (requiredQty <= 0 || batchAllocations.length === 0) return [];
    return buildDispatchNearExpiryEntries({
      productName,
      sku,
      warehouse,
      customerName,
      quantity: requiredQty,
      batchAllocations,
    });
  }, [productName, sku, warehouse, customerName, requiredQty, batchAllocations]);

  const multipleBatches = batchRows.length > 1;
  const activeBatchNumber = getActiveBatchSelection(selections);

  const handleBatchSelect = (batchNumber: string) => {
    onSelectionsChange(
      selectSingleBatchAllocation(productName, warehouse, batchNumber, requiredQty),
    );
  };

  const handleQtyChange = (batchNumber: string, value: string, maxAvailable: number) => {
    const parsed = parseInt(value, 10);
    const qty = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, maxAvailable));

    if (multipleBatches) {
      onSelectionsChange(
        qty > 0
          ? { [batchNumber]: qty }
          : {},
      );
      return;
    }

    onSelectionsChange({
      ...selections,
      [batchNumber]: qty,
    });
  };

  if (requiredQty <= 0) return null;
  if (batchRows.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white px-3 py-3 space-y-2.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-brand-600" />
            Batch Allocation — {productName}
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>
            <span className="text-muted-foreground">{qtyLabel}: </span>
            <span className="font-bold text-foreground">{requiredQty}</span>
          </span>
          {schemeEntries.length > 0 && (
            <NearExpirySchemeBadge entries={schemeEntries} />
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-border/70">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                {[
                  ...(multipleBatches ? ["Select"] : []),
                  "Batch No.",
                  "Available Qty",
                  "MFG Date",
                  "Expiry Date",
                  "Remaining Days",
                  "Select Qty",
                  "Scheme Status",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-2.5 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batchRows.map((row) => {
                const selectedQty = selections[row.batchNumber] ?? 0;
                const isActiveBatch = activeBatchNumber === row.batchNumber;
                const schemeStatus = getBatchSchemeStatusLabel(
                  { productName, sku, warehouse, customerName },
                  row.batchNumber,
                  selectedQty,
                );
                const rowEntries = schemeEntries.filter(
                  (entry) => entry.batchNumber === row.batchNumber,
                );
                const rowDisabled = multipleBatches && !isActiveBatch;

                return (
                  <tr
                    key={row.batchNumber}
                    className={cn(
                      "border-b border-border/60 hover:bg-slate-50/40",
                      isActiveBatch && multipleBatches && "bg-brand-50/40",
                    )}
                  >
                    {multipleBatches && (
                      <td className="px-2.5 py-2 text-center w-14">
                        <input
                          type="radio"
                          name={`batch-select-${sku}`}
                          checked={isActiveBatch}
                          onChange={() => handleBatchSelect(row.batchNumber)}
                          className="h-3.5 w-3.5 accent-brand-600 cursor-pointer"
                          aria-label={`Select batch ${row.batchNumber}`}
                        />
                      </td>
                    )}
                    <td className="px-2.5 py-2 text-xs font-mono font-bold text-brand-700">
                      {row.batchNumber}
                    </td>
                    <td className="px-2.5 py-2 text-xs font-semibold text-center">
                      {row.availableQty}
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-muted-foreground">
                      {formatBatchExpiryDate(row.manufacturingDate)}
                    </td>
                    <td className="px-2.5 py-2 text-[11px] text-muted-foreground">
                      {formatBatchExpiryDate(row.expiryDate)}
                    </td>
                    <td className="px-2.5 py-2 text-xs font-bold text-center">
                      <span
                        className={cn(
                          row.remainingDays <= 30
                            ? "text-orange-700"
                            : "text-foreground",
                        )}
                      >
                        {row.remainingDays}
                      </span>
                    </td>
                    <td className="px-2.5 py-2 w-[110px]">
                      <Input
                        type="number"
                        min={0}
                        max={row.availableQty}
                        value={selectedQty === 0 ? "" : selectedQty}
                        disabled={rowDisabled}
                        onChange={(e) =>
                          handleQtyChange(row.batchNumber, e.target.value, row.availableQty)
                        }
                        className={cn(
                          "h-8 text-xs font-bold text-right",
                          rowDisabled && "bg-muted/40 cursor-not-allowed opacity-60",
                        )}
                      />
                    </td>
                    <td className="px-2.5 py-2 text-[11px]">
                      {schemeStatus === NEAR_EXPIRY_ELIGIBLE_LABEL ? (
                        <NearExpirySchemeBadge entries={rowEntries} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </div>
  );
}

export function buildBatchAllocationMapFromSelections(
  products: {
    productName: string;
    sku: string;
    warehouse: string;
    selections: Record<string, number>;
  }[],
): Record<string, BatchAllocation[]> {
  const map: Record<string, BatchAllocation[]> = {};
  for (const item of products) {
    const allocations = batchSelectionsToAllocations(
      item.productName,
      item.warehouse,
      item.selections,
    );
    if (allocations.length) {
      map[item.sku] = allocations;
    }
  }
  return map;
}
