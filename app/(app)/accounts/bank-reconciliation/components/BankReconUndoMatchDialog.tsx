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
import { undoMatch } from "@/lib/accounts/bank-recon-match-service";

interface BankReconUndoMatchDialogProps {
  bankAccountId: string;
  statementTransactionId: string | null;
  open: boolean;
  onClose: () => void;
  onUndone?: () => void;
}

export function BankReconUndoMatchDialog({
  bankAccountId,
  statementTransactionId,
  open,
  onClose,
  onUndone,
}: BankReconUndoMatchDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!statementTransactionId) return;
    const result = undoMatch({ bankAccountId, statementTransactionId, reason });
    if (!result.ok) {
      setError(result.error ?? "Undo failed");
      return;
    }
    setReason("");
    setError("");
    onUndone?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Undo Match
          </DialogTitle>
          <DialogDescription>
            Remove the match link and return the transaction to pending. Audit history is preserved.
          </DialogDescription>
        </DialogHeader>
        <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Undo reason (required)…" className="text-sm" />
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Undo
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
