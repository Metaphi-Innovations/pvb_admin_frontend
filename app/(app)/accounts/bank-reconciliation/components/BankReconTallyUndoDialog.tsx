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
import { undoReconciliation } from "@/lib/accounts/bank-recon-tally-service";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

export function BankReconTallyUndoDialog({
  open,
  onClose,
  linkId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  linkId: string | null;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const confirm = () => {
    if (!linkId) return;
    setSaving(true);
    setError(null);
    const res = undoReconciliation({ linkId, reason });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setReason("");
    onDone();
    onClose();
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
            Undo Reconciliation
          </DialogTitle>
          <DialogDescription className="pt-1 text-xs">
            This clears the Bank Date and reconciliation link only. The accounting voucher is not
            deleted, reversed, or modified.
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
            onClick={confirm}
          >
            Undo Reconciliation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
