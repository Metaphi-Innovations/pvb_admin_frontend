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
import { reopenReconciliation } from "@/lib/accounts/bank-recon-completion-service";

interface BankReconReopenDialogProps {
  sessionId: string | null;
  open: boolean;
  onClose: () => void;
  onReopened: () => void;
}

export function BankReconReopenDialog({
  sessionId,
  open,
  onClose,
  onReopened,
}: BankReconReopenDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleReopen = () => {
    if (!sessionId || !reason.trim()) {
      setError("Reopen reason is required.");
      return;
    }
    const result = reopenReconciliation({ sessionId, reason: reason.trim(), approvedBy: "Rajesh Kumar" });
    if (!result.ok) {
      setError(result.error ?? "Failed to reopen.");
      return;
    }
    onReopened();
    onClose();
    setReason("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Reopen Reconciliation
          </DialogTitle>
          <DialogDescription>
            This will unlock the period for edits. Original completion history is preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Reopen Reason *</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className="text-sm" />
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleReopen}>Reopen</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
