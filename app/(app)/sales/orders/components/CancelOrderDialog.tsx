"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { type SalesOrder } from "../orders-data";
import { useCancelSalesOrder } from "@/hooks/sales/use-sales-orders";

interface CancelOrderDialogProps {
  order: SalesOrder | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (order: SalesOrder) => void;
}

export default function CancelOrderDialog({
  order,
  open,
  onClose,
  onSuccess,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const cancelMutation = useCancelSalesOrder();

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  const handleConfirm = () => {
    if (!order) return;
    if (!reason.trim()) {
      setError("Cancellation reason is required.");
      return;
    }
    cancelMutation.mutate(
      { id: order.id, remarks: reason },
      {
        onSuccess: (updatedOrder) => {
          onSuccess(updatedOrder);
          setReason("");
          setError("");
          onClose();
        },
        onError: (err: any) => {
          setError(err?.message || "Failed to cancel sales order.");
        },
      }
    );
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            Cancel Order
          </DialogTitle>
          <DialogDescription className="text-xs">
            Cancel <span className="font-mono font-semibold text-brand-700">{order.soNumber}</span> for {order.customerName}. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Cancellation Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              rows={3}
              value={reason}
              onChange={e => { setReason(e.target.value); setError(""); }}
              placeholder="Enter reason for cancellation…"
              className="text-xs rounded-lg resize-none"
            />
            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>Back</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirm}
              disabled={cancelMutation.isPending}
            >
              Confirm Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
