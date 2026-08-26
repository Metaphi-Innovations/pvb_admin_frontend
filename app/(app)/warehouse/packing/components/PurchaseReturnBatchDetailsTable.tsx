"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import type { SalesOrderProduct } from "../types";
import { ProductSkuCell, GRN_QTY_INPUT_CLASSNAME } from "@/app/(app)/warehouse/grn/shared/components/ProductSkuCell";
import { PackingStackedQty } from "./PackingStackedQty";

function formatDisplayDate(iso?: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
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
  const qtyMeta = { packSize: caseSize, quantity_type: product.quantity_type, productSnapshot: product.productSnapshot };

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
      <ProductSkuCell name={product.product} sku={product.sku} />
      <div className="overflow-x-auto rounded-lg border border-border/70">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 w-8"></th>
              {["Batch No.", "GRN No.", "Mfg Date", "Expiry Date", "Qty", "Packing Qty"].map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 bg-brand-50/30">
              <td className="px-3 py-2.5 text-center w-8 align-top">
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
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-brand-700 align-top">
                {batchNumber}
              </td>
              <td className="px-3 py-2.5 font-mono text-xs font-semibold text-navy-700 align-top">
                {product.grnNo ?? "—"}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground align-top">
                {formatDisplayDate(product.mfgDate)}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground align-top">
                {product.expDate ? formatBatchExpiryDate(product.expDate) : "—"}
              </td>
              <td className="px-3 py-2.5 align-top">
                <PackingStackedQty
                  baseQty={product.orderBaseQty || requiredQty}
                  line={qtyMeta}
                />
              </td>
              <td className="px-3 py-2.5 align-top">
                <div className="flex flex-col gap-1.5 min-w-[88px]">
                  <Input
                    type="number"
                    min={0}
                    disabled={!isSelected}
                    value={!isSelected && rowQty === 0 ? "" : Math.floor(rowQty / caseSize)}
                    onChange={(e) => {
                      const newCases = parseInt(e.target.value || "0", 10);
                      const currentLoose = rowQty % caseSize;
                      handleQtyChange(
                        String((Number.isNaN(newCases) ? 0 : newCases) * caseSize + currentLoose),
                      );
                    }}
                    placeholder="0"
                    className={cn(
                      GRN_QTY_INPUT_CLASSNAME,
                      "h-8 w-14",
                      !isSelected && "cursor-not-allowed opacity-50",
                    )}
                  />
                  {isSelected && rowQty > 0 ? (
                    <PackingStackedQty baseQty={rowQty} line={qtyMeta} emphasize />
                  ) : null}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
