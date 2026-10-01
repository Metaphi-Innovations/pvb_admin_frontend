"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Check, AlertTriangle } from "lucide-react";
import { type SalesOrder } from "../orders-data";

interface ApproveOrderDialogProps {
  order: SalesOrder | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ApproveOrderDialog({
  order,
  open,
  onClose,
  onConfirm,
}: ApproveOrderDialogProps) {
  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Check className="w-4 h-4 text-emerald-600" />
            </div>
            Approve Order
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Approve sample order{" "}
            <span className="font-mono font-semibold text-brand-700">{order.soNumber}</span> for{" "}
            {order.customerName}? The order will move to confirmed status.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => { onConfirm(); onClose(); }}
          >
            <Check className="w-3.5 h-3.5" /> Confirm Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


