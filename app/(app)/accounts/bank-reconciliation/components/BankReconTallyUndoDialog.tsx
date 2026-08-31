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
import { BankReconciliationService } from "@/services/bank-reconciliation.service";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

export function BankReconTallyUndoDialog({
  open,
  onClose,
  bankAccountId,
  bankDetailId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  bankAccountId: string;
  bankDetailId: string | null;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const confirm = async () => {
    if (!bankDetailId || !bankAccountId) return;
    if (!reason.trim()) {
      setError("Audit reason is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await BankReconciliationService.unreconcile({
        bank_account_id: bankAccountId,
        bank_detail_ids: [bankDetailId],
        reason: reason.trim(),
      });
      setReason("");
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unreconcile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setReason("");
          setError(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Unreconcile
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">
            Are you sure you want to mark this transaction as unreconciled? This clears the Bank
            Date and reconciliation link only. The accounting voucher is not deleted, reversed, or
            modified.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>
            Audit Reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="text-xs"
            placeholder="Why is this reconciliation being undone?"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={saving || !reason.trim()}
            onClick={() => void confirm()}
          >
            Unreconcile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
