"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateManualReference } from "@/lib/accounts/bank-recon-manual-service";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";

interface BankReconUpdateReferenceDialogProps {
  transaction: BankReconTransactionRecord | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function BankReconUpdateReferenceDialog({
  transaction,
  open,
  onClose,
  onUpdated,
}: BankReconUpdateReferenceDialogProps) {
  const [referenceNumber, setReferenceNumber] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [transactionIdRef, setTransactionIdRef] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!transaction || !open) return;
    setReferenceNumber(transaction.reference && !transaction.utrNumber ? transaction.reference : "");
    setUtrNumber(transaction.utrNumber ?? "");
    setTransactionIdRef(transaction.transactionIdRef ?? "");
    setChequeNumber(transaction.chequeNo ?? "");
    setError("");
  }, [transaction, open]);

  const handleSave = () => {
    if (!transaction) return;
    const result = updateManualReference(transaction.id, {
      referenceNumber,
      utrNumber,
      transactionIdRef,
      chequeNumber,
    });
    if (!result.ok) {
      setError(result.error ?? "Update failed");
      return;
    }
    onUpdated?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Update Bank Reference</DialogTitle>
          <DialogDescription>
            Add or update UTR / reference before statement verification. Duplicate check will run automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reference Number</Label>
            <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">UTR Number</Label>
            <Input value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Transaction ID</Label>
            <Input value={transactionIdRef} onChange={(e) => setTransactionIdRef(e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Cheque Number</Label>
            <Input value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} className="h-9 text-sm" />
          </div>
        </div>
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            Update Reference
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
