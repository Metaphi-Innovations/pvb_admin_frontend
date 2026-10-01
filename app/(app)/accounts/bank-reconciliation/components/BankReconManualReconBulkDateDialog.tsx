"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/accounts/money-format";
import { applyBulkReconciliationDate } from "@/lib/accounts/bank-recon-manual-recon-service";

interface BankReconManualReconBulkDateDialogProps {
  bankAccountId: string;
  bookTargetIds: string[];
  depositTotal: number;
  withdrawalTotal: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function BankReconManualReconBulkDateDialog({
  bankAccountId,
  bookTargetIds,
  depositTotal,
  withdrawalTotal,
  open,
  onClose,
  onSaved,
}: BankReconManualReconBulkDateDialogProps) {
  const [date, setDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    if (!date) {
      setError("Date is required.");
      return;
    }
    const result = applyBulkReconciliationDate({
      bankAccountId,
      bookTargetIds,
      reconciliationDate: date,
      remarks,
    });
    if (!result.ok) {
      setError(result.error ?? "Failed to apply.");
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Apply Bulk Reconciliation Date</DialogTitle>
          <DialogDescription>
            Applying reconciliation date to {bookTargetIds.length} book transaction(s).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="rounded-lg border border-border px-3 py-2 bg-muted/20 space-y-1">
            <p>Deposits: <span className="font-semibold">{formatMoney(depositTotal)}</span></p>
            <p>Withdrawals: <span className="font-semibold">{formatMoney(withdrawalTotal)}</span></p>
          </div>
          <div className="space-y-1">
            <Label>Reconciliation Date *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label>Remarks</Label>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="text-sm" />
          </div>
          {error ? <p className="text-red-500">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleApply}>Apply</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
