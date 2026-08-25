"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProductSkuCell } from "./ProductSkuCell";

export type PartialGrnProductRow = {
  productName: string;
  productCode?: string;
  orderedQtyLabel: string;
  grnQtyLabel: string;
  pendingQtyLabel: string;
};

export function PartialGrnConfirmDialog({
  open,
  products,
  submitting = false,
  onCancel,
  onContinue,
}: {
  open: boolean;
  products: PartialGrnProductRow[];
  submitting?: boolean;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onCancel();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            Partial GRN Quantity
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs leading-relaxed text-muted-foreground">
            You are creating a GRN for a quantity less than the ordered quantity for the following
            product(s).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto max-h-[280px]">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">
                    Product
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">
                    Ordered Qty
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">
                    GRN Qty
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">
                    Pending Qty
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((row) => (
                  <tr
                    key={`${row.productName}-${row.productCode || ""}`}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-3 py-2.5 align-top">
                      <ProductSkuCell name={row.productName} sku={row.productCode} />
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums text-foreground align-top whitespace-nowrap">
                      {row.orderedQtyLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums font-semibold text-brand-700 align-top whitespace-nowrap">
                      {row.grnQtyLabel}
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs tabular-nums font-medium text-amber-700 align-top whitespace-nowrap">
                      {row.pendingQtyLabel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="flex gap-2 justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onContinue}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
