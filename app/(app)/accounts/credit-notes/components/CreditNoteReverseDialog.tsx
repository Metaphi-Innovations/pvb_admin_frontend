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

function todayDateInputValue(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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
  const [reversalDate, setReversalDate] = useState(todayDateInputValue);

  useEffect(() => {
    if (open) {
      setReason("");
      setReversalDate(todayDateInputValue());
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
          <DialogTitle className="text-sm font-bold">Reverse Voucher</DialogTitle>
          <DialogDescription className="text-xs">
            This voucher has already been posted. Continuing will create reversal entries for the
            ledgers impacted by this voucher. Do you want to continue?
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2 text-xs">
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
          <div className="space-y-1.5">
            <Label htmlFor="cn-rev-reason" className="text-xs font-medium">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cn-rev-reason"
              className="text-xs min-h-[72px] resize-none"
              placeholder="Enter reason…"
              value={reason}
              maxLength={REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {trimmed.length}/{REASON_MAX}
            </p>
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
            Close
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
            disabled={!canSubmit}
            onClick={() => {
              if (!canSubmit) return;
              onConfirm({
                reason: trimmed,
                reversal_date: reversalDate.trim() || todayDateInputValue(),
              });
            }}
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
            Continue / Reverse Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
