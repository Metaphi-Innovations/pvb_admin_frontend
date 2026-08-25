"use client";

import React, { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import {
  type PackingBatchInventoryRow,
  type PackingBatchStatus,
} from "../lib/packing-batch-allocation";
import { ProductSkuCell, GRN_QTY_INPUT_CLASSNAME } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { PackingStackedQty } from "./PackingStackedQty";

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
  allocatedQty?: number;
  pending_cases?: number;
  inventoryBatches: PackingBatchInventoryRow[];
}

export function PackingBatchSelectionTable({
  productName,
  sku,
  warehouse,
  requiredQty,
  selections,
  onSelectionsChange,
  caseSize = 10,
  allocatedQty,
  pending_cases,
  inventoryBatches,
}: PackingBatchSelectionTableProps) {
  const rows = useMemo(() => {
    const all = [...inventoryBatches];

    Object.keys(selections).forEach((bNo) => {
      if (!all.some((r) => r.batchNumber === bNo)) {
        all.push({
          batchNumber: bNo,
          manufacturingDate: "—",
          expiryDate: "—",
          availableQty: selections[bNo],
          remainingDays: 999,
          status: "Available",
          isSelectable: true,
        });
      }
    });

    return all;
  }, [inventoryBatches, selections]);

  const qtyMeta = { packSize: caseSize };

  const handleQtyChange = (row: PackingBatchInventoryRow, value: string) => {
    if (!row.isSelectable) return;

    const parsed = parseInt(value, 10);
    const qty = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);

    const next = { ...selections };
    next[row.batchNumber] = qty;
    onSelectionsChange(next);
  };

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <ProductSkuCell name={productName} sku={sku} />
      <div className="overflow-x-auto rounded-lg border border-border/70 mt-2">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 w-8"></th>
              {["Batch No.", "Mfg Date", "Expiry Date", "Allocated Qty", "Pending Qty", "Packing Qty", "Status"].map(
                (header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                  >
                    {header}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rowQty = selections[row.batchNumber] ?? 0;
              const isSelected = selections[row.batchNumber] !== undefined;
              const isExpired = row.status === "Expired";
              const isNearExpiry = row.status === "Near Expiry";
              const statusCfg = STATUS_CFG[row.status];

              const displayAllocated = allocatedQty !== undefined ? allocatedQty : row.availableQty;
              const displayPending = pending_cases !== undefined ? pending_cases : requiredQty;

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
                  <td className="px-3 py-2 text-center w-8 align-top">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded accent-brand-600"
                      checked={isSelected}
                      disabled={!row.isSelectable}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const next = { ...selections };
                        if (checked) {
                          next[row.batchNumber] = 0;
                        } else {
                          next[row.batchNumber] = undefined as unknown as number;
                        }
                        onSelectionsChange(next);
                      }}
                      aria-label={`Select batch ${row.batchNumber}`}
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold",
                        isExpired ? "text-red-700" : "text-foreground",
                      )}
                    >
                      {row.batchNumber}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground align-top">
                    {row.manufacturingDate}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground align-top">
                    {formatBatchExpiryDate(row.expiryDate)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <PackingStackedQty baseQty={displayAllocated} line={qtyMeta} />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <PackingStackedQty baseQty={displayPending} line={qtyMeta} emphasize />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          disabled={!row.isSelectable || !isSelected}
                          value={!isSelected && rowQty === 0 ? "" : Math.floor(rowQty / caseSize)}
                          onChange={(e) => {
                            const newCases = parseInt(e.target.value || "0", 10);
                            const currentLoose = rowQty % caseSize;
                            handleQtyChange(
                              row,
                              String((Number.isNaN(newCases) ? 0 : newCases) * caseSize + currentLoose),
                            );
                          }}
                          placeholder="0"
                          className={cn(
                            GRN_QTY_INPUT_CLASSNAME,
                            "h-8 w-14",
                            isExpired && "bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed",
                            (!row.isSelectable || !isSelected) && "cursor-not-allowed opacity-50",
                          )}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={caseSize - 1}
                          disabled={!row.isSelectable || !isSelected}
                          value={!isSelected && rowQty === 0 ? "" : rowQty % caseSize}
                          onChange={(e) => {
                            const newLoose = parseInt(e.target.value || "0", 10);
                            const currentCases = Math.floor(rowQty / caseSize);
                            handleQtyChange(
                              row,
                              String(currentCases * caseSize + (Number.isNaN(newLoose) ? 0 : newLoose)),
                            );
                          }}
                          placeholder="0"
                          className={cn(
                            GRN_QTY_INPUT_CLASSNAME,
                            "h-8 w-12",
                            isExpired && "bg-red-50/50 border-red-200 text-red-400 cursor-not-allowed",
                            (!row.isSelectable || !isSelected) && "cursor-not-allowed opacity-50",
                          )}
                        />
                      </div>
                      {isSelected && rowQty > 0 ? (
                        <PackingStackedQty baseQty={rowQty} line={qtyMeta} emphasize />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 align-top">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border",
                        statusCfg.bg,
                      )}
                    >
                      {isNearExpiry && <AlertTriangle className="w-3 h-3 flex-shrink-0" />}
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
