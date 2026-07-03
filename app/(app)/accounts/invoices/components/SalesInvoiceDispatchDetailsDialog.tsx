"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Truck } from "lucide-react";
import { DispatchDetailsPanel } from "@/app/(app)/sales/orders/components/DispatchDetailsPanel";
import { getDispatchById, getDispatchByNumber } from "@/lib/accounts/dispatch-invoice-bridge";

interface SalesInvoiceDispatchDetailsDialogProps {
  dispatchId?: string;
  dispatchNo?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesInvoiceDispatchDetailsDialog({
  dispatchId,
  dispatchNo,
  open,
  onOpenChange,
}: SalesInvoiceDispatchDetailsDialogProps) {
  const dispatch =
    (dispatchId ? getDispatchById(dispatchId) : null) ??
    (dispatchNo ? getDispatchByNumber(dispatchNo) : null);

  if (!dispatch) return null;

  const title = dispatch.dispatchNumber || dispatch.dispatch_no || dispatchNo || "Dispatch";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-start gap-2 pr-6">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold leading-tight font-mono text-brand-700">
                {title}
              </DialogTitle>
              <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
                Dispatch & transport details
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/10">
          <DispatchDetailsPanel dispatch={dispatch} />
        </div>

        <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-end flex-shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
