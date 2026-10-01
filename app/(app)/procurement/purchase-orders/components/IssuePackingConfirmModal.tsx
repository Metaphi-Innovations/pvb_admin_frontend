"use client";

import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PurchaseReturn } from "../../purchase-returns/purchase-return-data";

export function IssuePackingConfirmModal({
  open,
  onOpenChange,
  record,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: PurchaseReturn | null;
  onConfirm: () => void;
}) {
  if (!record) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[400]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50">
              <Package className="h-4 w-4 text-amber-500" />
            </div>
            Issue for Packing
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs leading-relaxed">
            Issue purchase return{" "}
            <span className="font-mono font-semibold text-foreground">{record.returnNumber}</span>{" "}
            for warehouse packing? The return will be sent to the packing queue with{" "}
            <span className="font-medium text-foreground">{record.totalReturnQty}</span> total return
            qty.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={handleConfirm}
          >
            <Package className="w-3.5 h-3.5" /> Issue for Packing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
