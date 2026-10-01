"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelManualTransaction } from "@/lib/accounts/bank-recon-manual-service";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";

interface BankReconCancelManualDialogProps {
  transaction: BankReconTransactionRecord | null;
  open: boolean;
  onClose: () => void;
  onCancelled?: () => void;
}

export function BankReconCancelManualDialog({
  transaction,
  open,
  onClose,
  onCancelled,
}: BankReconCancelManualDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!transaction) return;
    const result = cancelManualTransaction(transaction.id, reason);
    if (!result.ok) {
      setError(result.error ?? "Cancellation failed");
      return;
    }
    setReason("");
    setError("");
    onCancelled?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            Cancel Manual Entry
          </DialogTitle>
          <DialogDescription>
            This will soft-cancel the manual transaction. It remains in audit history and can be viewed under the Cancelled filter.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Cancellation reason (required)…"
          className="text-sm"
        />
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Back
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Confirm Cancellation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
