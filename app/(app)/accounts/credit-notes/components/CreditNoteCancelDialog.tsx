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

export function CreditNoteCancelDialog({
  open,
  onClose,
  creditNoteNo,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  creditNoteNo: string;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");

  const handleClose = () => {
    if (busy) return;
    setReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Discard Voucher</DialogTitle>
          <DialogDescription className="text-xs">
            Are you sure you want to discard this voucher entry
            {creditNoteNo ? ` (${creditNoteNo})` : ""}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <Label className="text-xs">Reason (optional)</Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cancellation reason…"
            disabled={busy}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-sm font-medium"
            onClick={handleClose}
            disabled={busy}
          >
            Close
          </Button>
          <Button
            size="sm"
            className="h-9 text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              onConfirm(reason.trim());
            }}
          >
            Discard Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
