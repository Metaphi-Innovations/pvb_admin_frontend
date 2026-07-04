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
}: {
  open: boolean;
  onClose: () => void;
  creditNoteNo: string;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Cancel Credit Note</DialogTitle>
          <DialogDescription className="text-xs">
            Cancel {creditNoteNo}? This will be recorded in the activity trail.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <Label className="text-xs">Reason (optional)</Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Cancellation reason…"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            className="h-9 text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              onConfirm(reason.trim());
              setReason("");
              onClose();
            }}
          >
            Cancel Credit Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
