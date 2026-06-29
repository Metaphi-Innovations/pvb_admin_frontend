"use client";

import React, { useMemo } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { masterToday } from "@/lib/masters/common";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import {
  buildFefoRecommendedSelections,
  getFefoRecommendedBatchNumbers,
  getMaxBatchPackingQty,
  getPackingBatchInventoryRows,
  type PackingBatchInventoryRow,
  type PackingBatchStatus,
} from "../lib/packing-batch-allocation";

const STATUS_CFG: Record<
  PackingBatchStatus,
  { bg: string; dot: string; label: string }
> = {
  Available: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Available",
  },
  "Near Expiry": {
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
    label: "Near Expiry",
  },
  Expired: {
    bg: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
    label: "Expired",
  },
};

interface PackingBatchSelectionTableProps {
  productName: string;
  sku: string;
  warehouse: string;
  requiredQty: number;
  selections: Record<string, number>;
  onSelectionsChange: (selections: Record<string, number>) => void;
}

export function PackingBatchSelectionTable({
  productName,
  sku,
  warehouse,
  requiredQty,
  selections,
  onSelectionsChange,
}: PackingBatchSelectionTableProps) {
  const rows = useMemo(
    () => getPackingBatchInventoryRows(productName, warehouse, masterToday(), sku),
    [productName, warehouse, sku],
  );

  const fefoRecommended = useMemo(
    () => getFefoRecommendedBatchNumbers(rows, requiredQty),
    [rows, requiredQty],
  );

  const handleToggleRow = (row: PackingBatchInventoryRow, checked: boolean) => {
    if (!row.isSelectable) return;

    const next = { ...selections };
    if (!checked) {
      delete next[row.batchNumber];
      onSelectionsChange(next);
      return;
    }

    const maxQty = getMaxBatchPackingQty(
      row.batchNumber,
      next,
      requiredQty,
      row.availableQty,
    );
    if (maxQty <= 0) return;
    next[row.batchNumber] = maxQty;
    onSelectionsChange(next);
  };

  const handleQtyChange = (row: PackingBatchInventoryRow, value: string) => {
    if (!row.isSelectable) return;

    const parsed = parseInt(value, 10);
    const maxAllowed = getMaxBatchPackingQty(
      row.batchNumber,
      selections,
      requiredQty,
      row.availableQty,
    );
    const qty = Number.isNaN(parsed) ? 0 : Math.max(0, Math.min(parsed, maxAllowed));

    const next = { ...selections };
    if (qty <= 0) {
      delete next[row.batchNumber];
    } else {
      next[row.batchNumber] = qty;
    }
    onSelectionsChange(next);
  };

  const applyFefoRecommendation = () => {
    onSelectionsChange(buildFefoRecommendedSelections(rows, requiredQty));
  };

  if (requiredQty <= 0 || rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={applyFefoRecommendation}
          className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-md border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          Apply FEFO
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
                "Select",
                "Batch No.",
                "SKU",
                "Mfg Date",
                "Expiry Date",
                "Available Qty",
                "Required Qty",
                "Packing Qty",
                "Status",
              ].map((header) => (
                <th
                  key={header}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    (header === "Available Qty" ||
                      header === "Required Qty" ||
                      header === "Packing Qty") &&
                      "text-right",
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowQty = selections[row.batchNumber] ?? 0;
              const isSelected = rowQty > 0;
              const isExpired = row.status === "Expired";
              const isNearExpiry = row.status === "Near Expiry";
              const isFefo = fefoRecommended.has(row.batchNumber);
              const statusCfg = STATUS_CFG[row.status];
              const maxPackingQty = getMaxBatchPackingQty(
                row.batchNumber,
                selections,
                requiredQty,
                row.availableQty,
              );
              const canSelect = row.isSelectable && (isSelected || maxPackingQty > 0);

              return (
                <tr
                  key={row.batchNumber}
                  className={cn(
                    "border-b border-border/60 transition-colors",
                    isExpired && "bg-red-50/90",
                    !isExpired && isSelected && "bg-brand-50/40",
                    !isExpired && isFefo && !isSelected && "bg-brand-50/20",
                  )}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600 disabled:opacity-40"
                      checked={isSelected}
                      disabled={!canSelect}
                      onChange={(e) => handleToggleRow(row, e.target.checked)}
                      aria-label={`Select batch ${row.batchNumber}`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold",
                          isExpired ? "text-red-700" : "text-foreground",
                        )}
                      >
                        {row.batchNumber}
                      </span>
                      {isFefo && !isExpired && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 border border-brand-200">
                          FEFO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700">
                    {sku}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.manufacturingDate}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatBatchExpiryDate(row.expiryDate)}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono font-bold text-right tabular-nums">
                    {row.availableQty}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold text-right tabular-nums text-foreground">
                    {requiredQty}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min={0}
                      max={maxPackingQty}
                      disabled={!row.isSelectable}
                      value={!isSelected && rowQty === 0 ? "" : rowQty}
                      onChange={(e) => handleQtyChange(row, e.target.value)}
                      className={cn(
                        "h-8 w-20 ml-auto text-xs font-bold text-right tabular-nums",
                        isExpired && "bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed",
                        !row.isSelectable && "cursor-not-allowed",
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border",
                        statusCfg.bg,
                      )}
                    >
                      {isNearExpiry && (
                        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                      )}
                      {statusCfg.label}
                    </span>
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
