"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type Gstr2aReasonMode =
  | "accept"
  | "unmatch"
  | "resolve"
  | "remark"
  | "mark_review"
  | "mark_reviewed"
  | "match_partial";

const MODE_COPY: Record<
  Gstr2aReasonMode,
  { title: string; description: string; label: string; required: boolean }
> = {
  accept: {
    title: "Accept Match",
    description:
      "Accept this document relationship despite the remaining differences.",
    label: "Reason",
    required: true,
  },
  unmatch: {
    title: "Unmatch",
    description: "Remove the current books ↔ GSTR-2A link for this row.",
    label: "Reason",
    required: true,
  },
  resolve: {
    title: "Resolve Review",
    description: "Mark this reconciliation item as resolved.",
    label: "Reason",
    required: true,
  },
  remark: {
    title: "Add Remark",
    description: "Save a remark on this reconciliation item.",
    label: "Remark",
    required: true,
  },
  mark_review: {
    title: "Mark for Review",
    description: "Flag this item for review.",
    label: "Reason (optional)",
    required: false,
  },
  mark_reviewed: {
    title: "Mark Reviewed",
    description: "Mark this item as reviewed.",
    label: "Reason (optional)",
    required: false,
  },
  match_partial: {
    title: "Confirm Match",
    description:
      "This link has remaining differences. Provide a reason to continue.",
    label: "Reason",
    required: true,
  },
};

export function Gstr2aReasonDialog({
  open,
  mode,
  subtitle,
  submitting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: Gstr2aReasonMode | null;
  subtitle?: string;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const copy = mode ? MODE_COPY[mode] : null;

  return (
    <Dialog
      open={open && mode != null}
      onOpenChange={(o) => {
        if (!o) {
          setText("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{copy?.title}</DialogTitle>
          <DialogDescription className="pt-1 text-xs space-y-1">
            <span className="block">{copy?.description}</span>
            {subtitle ? <span className="block text-muted-foreground">{subtitle}</span> : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label className="text-xs font-medium">{copy?.label}</label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Enter details…"
            className="text-sm rounded-lg"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={submitting}
            onClick={() => {
              setText("");
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={
              submitting ||
              (copy?.required === true && !text.trim())
            }
            onClick={() => {
              onConfirm(text.trim());
              setText("");
            }}
          >
            {submitting ? "Saving…" : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
