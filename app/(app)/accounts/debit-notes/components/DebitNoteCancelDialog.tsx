"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DebitNoteCancelDialogMode = "cancel" | "reverse";

export function DebitNoteCancelDialog({
  open,
  onClose,
  debitNoteNo,
  onConfirm,
  mode = "cancel",
}: {
  open: boolean;
  onClose: () => void;
  debitNoteNo: string;
  onConfirm: (reason: string) => void;
  mode?: DebitNoteCancelDialogMode;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isReverse = mode === "reverse";

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Reason is required.");
      return;
    }
    onConfirm(trimmed);
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className={`text-sm ${isReverse ? "text-purple-700 font-bold" : ""}`}>
            {isReverse ? "Reverse Posted Debit Note" : "Cancel Debit Note"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isReverse
              ? `Cancel ${debitNoteNo}? This will reverse the posted Debit Note and generate the corresponding accounting reversal. Any applicable invoice settlement will also be unsettled. This action cannot be undone from the Debit Note screen.`
              : `Cancel ${debitNoteNo}? This will be recorded in the activity trail.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <Label className="text-xs">
            Reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            placeholder={isReverse ? "Reversal reason…" : "Cancellation reason…"}
          />
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={handleClose}>
            Close
          </Button>
          <Button
            size="sm"
            className={`h-9 text-sm font-medium text-white ${
              isReverse
                ? "bg-purple-700 hover:bg-purple-800"
                : "bg-red-600 hover:bg-red-700"
            }`}
            onClick={handleConfirm}
          >
            {isReverse ? "Reverse Debit Note" : "Cancel Debit Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
