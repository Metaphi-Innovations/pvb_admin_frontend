"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { undoManualReconciliation } from "@/lib/accounts/bank-recon-manual-recon-service";

interface BankReconManualReconUndoDialogProps {
  groupId: string | null;
  open: boolean;
  onClose: () => void;
  onUndone: () => void;
}

export function BankReconManualReconUndoDialog({
  groupId,
  open,
  onClose,
  onUndone,
}: BankReconManualReconUndoDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleUndo = () => {
    if (!groupId || !reason.trim()) {
      setError("Undo reason is required.");
      return;
    }
    const result = undoManualReconciliation({ groupId, reason: reason.trim() });
    if (!result.ok) {
      setError(result.error ?? "Failed to undo.");
      return;
    }
    onUndone();
    onClose();
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Undo Reconciliation
          </DialogTitle>
          <DialogDescription>This will restore available amounts and reconciliation status. Vouchers are not deleted.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Undo Reason *</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm" />
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleUndo}>Undo</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
