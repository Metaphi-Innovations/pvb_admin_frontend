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

export function CreditNoteReasonDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason: string) => void;
  busy?: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setReason("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{title}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1 py-2">
          <Label className="text-xs">
            Reason <span className="text-red-500">*</span>
          </Label>
          <Textarea
            className="min-h-[72px] text-xs resize-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Required…"
            disabled={busy}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              setReason("");
              onClose();
            }}
            disabled={busy}
          >
            Close
          </Button>
          <Button
            size="sm"
            className={
              destructive
                ? "h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                : "h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            }
            disabled={busy || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
