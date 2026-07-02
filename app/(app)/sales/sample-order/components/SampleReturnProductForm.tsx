"use client";

import { Trash2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { formatReturnAmount } from "../sample-return-data";
import { calcReturnLineAmount } from "../sample-return-utils";
import type { PRLineItem } from "@/app/(app)/procurement/purchase-requests/pr-data";

interface SampleReturnProductFormProps {
  dispatch: DispatchRecord;
  returnQuantities: Record<string, string>;
  returnRemarks: string;
  onQuantityChange: (sku: string, value: string) => void;
  onRemarksChange: (value: string) => void;
  onUpdateItem: (uid: string, patch: Partial<PRLineItem>) => void;
  productRemarks: Record<string, string>;
  onProductRemarksChange: (sku: string, val: string) => void;
}

export function SampleReturnProductForm({
  dispatch,
  returnQuantities,
  returnRemarks,
  onQuantityChange,
  onRemarksChange,
  onUpdateItem,
  productRemarks,
  onProductRemarksChange,
}: SampleReturnProductFormProps) {
  let selectedCount = 0;
  let totalQty = 0;
  let totalAmount = 0;

  for (const p of dispatch.products) {
    const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
    if (returnQty <= 0) continue;
    selectedCount += 1;
    totalQty += returnQty;
    totalAmount += calcReturnLineAmount(returnQty, p.unitRate ?? 0);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Dispatched Sample Products</h2>
              <p className="text-xs text-muted-foreground">Select packing-list batches and enter return quantity in cases and loose pieces.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[22%]">Product</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[12%]">SKU</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">Dispatch Qty</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[10%]">Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">Cases</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">Pieces</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">Total Unit Qty</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[12%]">Remarks</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[8%]">Amount</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[4%]"></th>
              </tr>
            </thead>
            <tbody>
              {dispatch.products.map((p) => {
                const dispatchedQty = p.dispatchQty || 0;
                const dispatchedCases = Math.floor(dispatchedQty);
                const dispatchedPieces = Math.round((dispatchedQty - dispatchedCases) * 10);

                const dispatchDisplay = dispatchedPieces > 0
                  ? `${dispatchedCases} Case${dispatchedCases !== 1 ? "s" : ""} ${dispatchedPieces} Piece${dispatchedPieces !== 1 ? "s" : ""}`
                  : `${dispatchedCases} Case${dispatchedCases !== 1 ? "s" : ""}`;

                const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
                const caseQty = Math.floor(returnQty / 10);
                const pieceQty = returnQty % 10;

                const quantityType = returnQty >= 10 && pieceQty === 0 ? "Case" : "Piece";
                const isCaseType = quantityType === "Case";

                return (
                  <tr key={p.sku} className="border-b border-border/70 hover:bg-muted/30 align-top">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-xs text-foreground">{p.product}</p>
                        {p.batchNo && <p className="text-[11px] text-muted-foreground font-mono">{p.batchNo}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-brand-700">{p.sku}</td>
                    <td className="px-4 py-3 text-right text-xs font-semibold text-foreground">{dispatchDisplay}</td>

                    <td className="px-2 py-2">
                      <select
                        className="h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={quantityType}
                        onChange={(e) => {
                          const val = e.target.value as "Case" | "Piece";
                          if (val === "Case") {
                            onUpdateItem(p.sku, { requestedQty: caseQty * 10 });
                          }
                        }}
                      >
                        <option value="Case">Case</option>
                        <option value="Piece">Piece</option>
                      </select>
                    </td>

                    <td className="px-2 py-2">
                      <Input
                        value={caseQty || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateItem(p.sku, { requestedQty: val * 10 + (isCaseType ? 0 : pieceQty) });
                        }}
                        inputMode="numeric"
                        className="h-8 text-xs w-full"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <Input
                        disabled={isCaseType}
                        value={isCaseType ? "" : (pieceQty || "")}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdateItem(p.sku, { requestedQty: caseQty * 10 + val });
                        }}
                        inputMode="numeric"
                        className="h-8 text-xs w-full disabled:opacity-50"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-2 py-2 text-center">
                      <Input
                        disabled
                        value={returnQty || ""}
                        className="h-8 text-xs w-16 mx-auto font-semibold bg-muted text-muted-foreground text-center"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <Input
                        type="text"
                        value={productRemarks[p.sku] || ""}
                        onChange={(e) => {
                          onProductRemarksChange(p.sku, e.target.value);
                        }}
                        placeholder="Optional remarks"
                        className="h-8 text-xs rounded-lg w-full"
                      />
                    </td>

                    <td className="px-4 py-3 text-right text-xs font-bold tabular-nums font-mono text-foreground">
                      {formatReturnAmount(calcReturnLineAmount(returnQty, p.unitRate ?? 0))}
                    </td>

                    <td className="px-4 py-2 text-right">
                      {returnQty > 0 && (
                        <button
                          type="button"
                          title="Clear Quantity"
                          onClick={() => {
                            onUpdateItem(p.sku, { requestedQty: 0, remarks: "" });
                            onProductRemarksChange(p.sku, "");
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {selectedCount} product(s) selected · {totalQty} total return qty
        </p>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sample Return Value</p>
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

export function getSampleReturnFormSummary(
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
