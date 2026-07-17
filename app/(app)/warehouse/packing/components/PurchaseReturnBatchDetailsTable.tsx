"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import { getMaxBatchPackingQty } from "../lib/packing-batch-allocation";
import type { SalesOrderProduct } from "../types";

function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function formatCaseLoose(qty: number, caseSize: number): string | null {
  if (!qty || qty <= 0) return null;
  const cases = Math.floor(qty / caseSize);
  const loose = qty % caseSize;
  if (cases === 0) return `${loose} Ls`;
  if (loose === 0) return `${cases} Cs`;
  return `${cases} Cs, ${loose} Ls`;
}

interface PurchaseReturnBatchDetailsTableProps {
  product: SalesOrderProduct;
  requiredQty: number;
  selections: Record<string, number>;
  onSelectionsChange: (selections: Record<string, number>) => void;
  caseSize?: number;
}

export function PurchaseReturnBatchDetailsTable({
  product,
  requiredQty,
  selections,
  onSelectionsChange,
  caseSize = 10,
}: PurchaseReturnBatchDetailsTableProps) {
  const batchNumber = product.batchNumber;

  if (!batchNumber) return null;

  const rowQty = selections[batchNumber] ?? 0;
  const isSelected = selections[batchNumber] !== undefined;

  const handleQtyChange = (value: string) => {
    const parsed = parseInt(value, 10);
    const qty = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);

    const next = { ...selections };
    next[batchNumber] = qty;
    onSelectionsChange(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-0.5">
        Return Batch Details
      </p>
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 w-8"></th>
              {[
                "Batch No.",
                "GRN No.",
                "Mfg Date",
                "Expiry Date",
                "Return Qty",
                "Packing Qty",
              ].map((header) => (
                <th
                  key={header}
                  className={cn(
                    "px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                    (header === "Return Qty" || header === "Packing Qty") && "text-right",
                  )}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 bg-brand-50/30">
              <td className="px-3 py-2.5 text-center w-8">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600"
                  checked={isSelected}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const next = { ...selections };
                    if (checked) {
                      next[batchNumber] = 0;
                    } else {
                      next[batchNumber] = undefined as unknown as number;
                    }
                    onSelectionsChange(next);
                  }}
                  aria-label={`Select batch ${batchNumber}`}
                />
              </td>
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700">
                {batchNumber}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-navy-700">
                {product.grnNo ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {formatDisplayDate(product.mfgDate)}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                {product.expDate ? formatBatchExpiryDate(product.expDate) : "—"}
              </td>
              <td className="px-3 py-2.5 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold tabular-nums text-foreground">
                    {product.ordered_cases}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                    {formatCaseLoose(product.ordered_cases, caseSize) || "0 Ls"}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      min={0}
                      disabled={!isSelected}
                      value={!isSelected && rowQty === 0 ? "" : Math.floor(rowQty / caseSize)}
                      onChange={(e) => {
                        const newCases = parseInt(e.target.value || "0", 10);
                        const currentLoose = rowQty % caseSize;
                        handleQtyChange(
                          String(
                            (Number.isNaN(newCases) ? 0 : newCases) * caseSize + currentLoose,
                          ),
                        );
                      }}
                      placeholder="0"
                      className={cn(
                        "h-8 w-14 text-xs font-bold text-center tabular-nums",
                        !isSelected && "cursor-not-allowed opacity-50",
                      )}
                    />
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Cases
                    </span>
                  </div>
                  <span className="text-muted-foreground/50 text-xs font-bold mb-4">+</span>
                  <div className="flex flex-col items-center gap-0.5">
                    <Input
                      type="number"
                      min={0}
                      max={caseSize - 1}
                      disabled={!isSelected}
                      value={!isSelected && rowQty === 0 ? "" : rowQty % caseSize}
                      onChange={(e) => {
                        const newLoose = parseInt(e.target.value || "0", 10);
                        const currentCases = Math.floor(rowQty / caseSize);
                        handleQtyChange(
                          String(
                            currentCases * caseSize + (Number.isNaN(newLoose) ? 0 : newLoose),
                          ),
                        );
                      }}
                      placeholder="0"
                      className={cn(
                        "h-8 w-12 text-xs font-bold text-center tabular-nums",
                        !isSelected && "cursor-not-allowed opacity-50",
                      )}
                    />
                    <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Loose
                    </span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
