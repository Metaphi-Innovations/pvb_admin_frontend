"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatBatchExpiryDate } from "../../dispatch/near-expiry-dispatch";
import type { PackingSummaryLine } from "../lib/packing-batch-allocation";

interface PackingAllocationSummaryDialogProps {
  open: boolean;
  packingNo: string;
  orderNo: string;
  lines: PackingSummaryLine[];
  onClose: () => void;
}

export function PackingAllocationSummaryDialog({
  open,
  packingNo,
  orderNo,
  lines,
  onClose,
}: PackingAllocationSummaryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            Packing Completed
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            <span className="font-mono font-semibold text-brand-700">{packingNo}</span> created for{" "}
            <span className="font-mono font-semibold">{orderNo}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Product
                </th>
                <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pack Qty
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Allocated Batches
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.sku} className="border-b border-border/60 align-top">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-foreground">{line.product}</p>
                    <p className="font-mono text-[10px] text-brand-700 mt-0.5">{line.sku}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-bold tabular-nums">
                    {line.packingQty}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="space-y-1">
                      {line.allocations.map((alloc) => (
                        <div
                          key={`${line.sku}-${alloc.batchNumber}`}
                          className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]"
                        >
                          <span className="font-mono font-semibold text-foreground">{alloc.batchNumber}</span>
                          <span className="text-muted-foreground">
                            Exp {formatBatchExpiryDate(alloc.expiryDate)}
                          </span>
                          <span className="font-bold text-emerald-700">× {alloc.allocatedQty}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter className="pt-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onClose}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
