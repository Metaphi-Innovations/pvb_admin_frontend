"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";

const REASON_MAX = 2000;

export function CreditNoteReverseDialog({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (payload: { reason: string; reversal_date?: string }) => void | Promise<void>;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");
  const [reversalDate, setReversalDate] = useState("");

  useEffect(() => {
    if (!open) {
      setReason("");
      setReversalDate("");
    }
  }, [open]);

  const trimmed = reason.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= REASON_MAX && !busy;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-purple-700">Reverse Credit Note</DialogTitle>
          <DialogDescription className="text-xs">
            This will reverse the posted Credit Note and its accounting/settlement effect. This action
            cannot be undone directly.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="cn-rev-reason" className="text-xs font-medium">
              Reversal Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cn-rev-reason"
              className="text-xs min-h-[72px] resize-none"
              placeholder="Enter reversal reason…"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {trimmed.length}/{REASON_MAX}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cn-rev-date" className="text-xs font-medium">
              Reversal Date
            </Label>
            <Input
              id="cn-rev-date"
              type="date"
              className="h-9 text-xs"
              value={reversalDate}
              onChange={(e) => setReversalDate(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-purple-700 hover:bg-purple-800 text-white"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onConfirm({
                reason: trimmed,
                ...(reversalDate.trim() ? { reversal_date: reversalDate.trim() } : {}),
              });
            }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Reverse Credit Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
