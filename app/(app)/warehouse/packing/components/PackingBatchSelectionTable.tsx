"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { masterToday } from "@/lib/masters/common";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import {
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
  caseSize?: number;
}

export function PackingBatchSelectionTable({
  productName,
  sku,
  warehouse,
  requiredQty,
  selections,
  onSelectionsChange,
  caseSize = 10,
}: PackingBatchSelectionTableProps) {
  const rows = useMemo(() => {
    const all = getPackingBatchInventoryRows(productName, warehouse, masterToday(), sku);
    const fefo = getFefoRecommendedBatchNumbers(all, requiredQty);
    return all.filter((r) => fefo.has(r.batchNumber));
  }, [productName, warehouse, sku, requiredQty]);

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

  const formatCaseLoose = (qty: number) => {
    if (!qty || qty <= 0) return null;
    const cases = Math.floor(qty / caseSize);
    const loose = qty % caseSize;
    if (cases === 0) return `${loose} Ls`;
    if (loose === 0) return `${cases} Cs`;
    return `${cases} Cs, ${loose} Ls`;
  };

  if (requiredQty <= 0 || rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border/70 mt-2">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {[
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
              const statusCfg = STATUS_CFG[row.status];
              const maxPackingQty = getMaxBatchPackingQty(
                row.batchNumber,
                selections,
                requiredQty,
                row.availableQty,
              );

              return (
                <tr
                  key={row.batchNumber}
                  className={cn(
                    "border-b border-border/60 transition-colors",
                    isExpired && "bg-red-50/90",
                    !isExpired && isSelected && "bg-brand-50/40",
                    !isExpired && !isSelected && "bg-brand-50/20",
                  )}
                >
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
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-mono font-bold tabular-nums text-foreground">
                        {row.availableQty}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                        {formatCaseLoose(row.availableQty) || "0 Ls"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-semibold tabular-nums text-foreground">
                        {requiredQty}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                        {formatCaseLoose(requiredQty) || "0 Ls"}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="flex flex-col items-center gap-0.5">
                        <Input
                          type="number"
                          min={0}
                          disabled={!row.isSelectable}
                          value={!isSelected && rowQty === 0 ? "" : Math.floor(rowQty / caseSize)}
                          onChange={(e) => {
                            const newCases = parseInt(e.target.value || "0", 10);
                            const currentLoose = rowQty % caseSize;
                            handleQtyChange(row, String((Number.isNaN(newCases) ? 0 : newCases) * caseSize + currentLoose));
                          }}
                          placeholder="0"
                          className={cn(
                            "h-8 w-14 text-xs font-bold text-center tabular-nums",
                            isExpired && "bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed",
                            !row.isSelectable && "cursor-not-allowed",
                          )}
                        />
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Cases</span>
                      </div>
                      <span className="text-muted-foreground/50 text-xs font-bold mb-4">+</span>
                      <div className="flex flex-col items-center gap-0.5">
                        <Input
                          type="number"
                          min={0}
                          max={caseSize - 1}
                          disabled={!row.isSelectable}
                          value={!isSelected && rowQty === 0 ? "" : rowQty % caseSize}
                          onChange={(e) => {
                            const newLoose = parseInt(e.target.value || "0", 10);
                            const currentCases = Math.floor(rowQty / caseSize);
                            handleQtyChange(row, String(currentCases * caseSize + (Number.isNaN(newLoose) ? 0 : newLoose)));
                          }}
                          placeholder="0"
                          className={cn(
                            "h-8 w-12 text-xs font-bold text-center tabular-nums",
                            isExpired && "bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed",
                            !row.isSelectable && "cursor-not-allowed",
                          )}
                        />
                        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Loose</span>
                      </div>
                    </div>
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
