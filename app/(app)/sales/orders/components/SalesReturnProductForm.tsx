"use client";

import { Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { formatReturnAmount } from "../sales-return-data";
import { calcReturnLineAmount } from "../sales-return-utils";

interface SalesReturnProductFormProps {
  dispatch: DispatchRecord;
  checkedProducts: Record<string, boolean>;
  returnQuantities: Record<string, string>;
  returnRemarks: string;
  onCheckedChange: (sku: string, checked: boolean, defaultQty: number) => void;
  onQuantityChange: (sku: string, value: string) => void;
  onRemarksChange: (value: string) => void;
}

export function SalesReturnProductForm({
  dispatch,
  checkedProducts,
  returnQuantities,
  returnRemarks,
  onCheckedChange,
  onQuantityChange,
  onRemarksChange,
}: SalesReturnProductFormProps) {
  let selectedCount = 0;
  let totalQty = 0;
  let totalAmount = 0;

  for (const p of dispatch.products) {
    if (!checkedProducts[p.sku]) continue;
    const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
    if (returnQty <= 0) continue;
    selectedCount += 1;
    totalQty += returnQty;
    totalAmount += calcReturnLineAmount(returnQty, p.unitRate ?? 0);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-3">
          <Package className="w-3.5 h-3.5 text-brand-600" /> Dispatched Products — Select & Enter Return Qty
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-slate-50/60">
                <th className="py-2 px-2 w-8" />
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Dispatch Qty</th>
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Return Qty</th>
                <th className="py-2 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {dispatch.products.map((p) => {
                const isChecked = !!checkedProducts[p.sku];
                const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
                const unitRate = p.unitRate ?? 0;
                const lineAmount = isChecked && returnQty > 0 ? calcReturnLineAmount(returnQty, unitRate) : 0;

                return (
                  <tr key={p.sku} className={cn("border-b border-border/60", isChecked && "bg-brand-50/30")}>
                    <td className="py-2.5 px-2 align-middle">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                        checked={isChecked}
                        onChange={(e) => onCheckedChange(p.sku, e.target.checked, p.dispatchQty)}
                      />
                    </td>
                    <td className="py-2.5 px-3 text-xs font-bold">{p.product}</td>
                    <td className="py-2.5 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                    <td className="py-2.5 px-3 text-xs font-bold text-center">{p.packedQty}</td>
                    <td className="py-2.5 px-3 text-xs font-bold text-center">{p.dispatchQty}</td>
                    <td className="py-2.5 px-3 text-center">
                      {isChecked ? (
                        <Input
                          type="number"
                          min={1}
                          max={p.dispatchQty}
                          value={returnQuantities[p.sku] || ""}
                          onChange={(e) => onQuantityChange(p.sku, e.target.value)}
                          className="h-8 w-20 text-xs text-center mx-auto"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-semibold text-right">
                      {lineAmount > 0 ? formatReturnAmount(lineAmount) : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Line amount = Return Qty × unit rate from dispatch / sales order.
        </p>
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {selectedCount} product(s) selected · {totalQty} total return qty
        </p>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Return Amount</p>
          <p className="text-base font-bold text-red-600">{formatReturnAmount(totalAmount)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Return Remarks</p>
        <textarea
          value={returnRemarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          className="w-full h-20 text-xs border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Reason for return..."
        />
      </div>
    </div>
  );
}

export function getSalesReturnFormSummary(
  dispatch: DispatchRecord,
  checkedProducts: Record<string, boolean>,
  returnQuantities: Record<string, string>,
) {
  let totalQty = 0;
  let totalAmount = 0;
  let selectedCount = 0;

  for (const p of dispatch.products) {
    if (!checkedProducts[p.sku]) continue;
    const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
    if (returnQty <= 0) continue;
    selectedCount += 1;
    totalQty += returnQty;
    totalAmount += calcReturnLineAmount(returnQty, p.unitRate ?? 0);
  }

  return { totalQty, totalAmount, selectedCount };
}
