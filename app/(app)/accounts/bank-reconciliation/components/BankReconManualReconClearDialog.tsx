"use client";

import React, { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MANUAL_CLEARING_REASONS, type ManualClearingReason } from "@/lib/accounts/bank-recon-manual-recon-types";
import { markBookClearedWithoutStatement } from "@/lib/accounts/bank-recon-manual-recon-service";

interface BankReconManualReconClearDialogProps {
  bankAccountId: string;
  bookTargetId: string | null;
  bookLabel?: string;
  defaultReconciliationDate?: string;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function BankReconManualReconClearDialog({
  bankAccountId,
  bookTargetId,
  bookLabel,
  defaultReconciliationDate,
  open,
  onClose,
  onSaved,
}: BankReconManualReconClearDialogProps) {
  const [reconciliationDate, setReconciliationDate] = useState("");
  const [clearingReference, setClearingReference] = useState("");
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState<ManualClearingReason>("Manual Confirmation");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && defaultReconciliationDate) setReconciliationDate(defaultReconciliationDate);
  }, [open, defaultReconciliationDate]);

  const handleSave = () => {
    if (!bookTargetId || !reconciliationDate) {
      setError("Reconciliation date is required.");
      return;
    }
    const result = markBookClearedWithoutStatement({
      bankAccountId,
      bookTargetId,
      reconciliationDate,
      clearingReference,
      remarks,
      reason,
    });
    if (!result.ok) {
      setError(result.error ?? "Failed to mark cleared.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Mark Cleared Without Statement
          </DialogTitle>
          <DialogDescription>{bookLabel ?? "Book entry"} — no statement link will be created.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="space-y-1">
            <Label>Reconciliation Date *</Label>
            <Input type="date" value={reconciliationDate} onChange={(e) => setReconciliationDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Reason *</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ManualClearingReason)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MANUAL_CLEARING_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Clearing Reference</Label>
            <Input value={clearingReference} onChange={(e) => setClearingReference(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm" />
          </div>
          {error ? <p className="text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>Mark Cleared</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
