"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { PurchaseOrder } from "../po-data";

export type POActionConfirmType = "close" | "cancel";

const CONFIG: Record<
  POActionConfirmType,
  {
    title: string;
    description: string;
    confirmLabel: string;
    destructive: boolean;
  }
> = {
  close: {
    title: "Close Purchase Order",
    description:
      "Are you sure you want to close this purchase order? The PO will be marked as closed.",
    confirmLabel: "Close PO",
    destructive: false,
  },
  cancel: {
    title: "Cancel Purchase Order",
    description:
      "Are you sure you want to cancel this purchase order? The PO will be marked as cancelled.",
    confirmLabel: "Cancel PO",
    destructive: true,
  },
};

export function POActionConfirmModal({
  open,
  onOpenChange,
  po,
  action,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  po: PurchaseOrder | null;
  action: POActionConfirmType;
  onConfirm: () => void;
}) {
  if (!po) return null;

  const cfg = CONFIG[action];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm z-[400]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div
              className={cn(
                "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
                cfg.destructive
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50",
              )}
            >
              <AlertTriangle
                className={cn("h-4 w-4", cfg.destructive ? "text-red-500" : "text-amber-500")}
              />
            </div>
            {cfg.title}
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs leading-relaxed">
            {cfg.description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">PO No.</span>
            <span className="font-mono font-semibold text-brand-700">{po.poNumber}</span>
          </div>
          <div className="mt-1 flex justify-between gap-2">
            <span className="text-muted-foreground">Supplier</span>
            <span className="font-medium text-foreground text-right">{po.supplierName}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            No, keep PO
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs text-white",
              cfg.destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-brand-600 hover:bg-brand-700",
            )}
            onClick={handleConfirm}
          >
            {cfg.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
