"use client";

import { Check, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CreditNoteStatus } from "../credit-note-form-types";

const BTN = "h-8 text-xs gap-1.5";

export function CreditNoteFormActionBar({
  status,
  busy,
  canCancel,
  onDiscard,
  onSaveDraft,
  onSubmitForApproval,
  onApprove,
  onReject,
  onPost,
  onCancel,
}: {
  status?: CreditNoteStatus | string | null;
  busy?: boolean;
  canCancel?: boolean;
  onDiscard: () => void;
  onSaveDraft?: () => void;
  onSubmitForApproval?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPost?: () => void;
  onCancel?: () => void;
}) {
  const st = status || "DRAFT";
  const draftLike = st === "DRAFT" || st === "REJECTED" || !status;
  const pendingApproval = st === "PENDING_APPROVAL";
  const approved = st === "APPROVED";
  const posted = st === "POSTED";
  const cancelled = st === "CANCELLED" || st === "REVERSED";

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(BTN, "text-muted-foreground self-start sm:self-auto")}
          onClick={onDiscard}
          disabled={busy}
        >
          Discard Form
        </Button>
        {canCancel && !posted && !cancelled && onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onCancel}
            disabled={busy}
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Credit Note
          </Button>
        ) : null}
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
        {draftLike ? (
          <>
            {onSaveDraft ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={BTN}
                onClick={onSaveDraft}
                disabled={busy}
              >
                <Save className="w-3.5 h-3.5" /> Save Draft
              </Button>
            ) : null}
            {onSubmitForApproval ? (
              <Button
                type="button"
                size="sm"
                className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
                onClick={onSubmitForApproval}
                disabled={busy}
              >
                <Send className="w-3.5 h-3.5" /> Submit for Approval
              </Button>
            ) : null}
          </>
        ) : null}
        {pendingApproval ? (
          <>
            {onReject ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(BTN, "text-red-600 border-red-200")}
                onClick={onReject}
                disabled={busy}
              >
                Reject
              </Button>
            ) : null}
            {onApprove ? (
              <Button
                type="button"
                size="sm"
                className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
                onClick={onApprove}
                disabled={busy}
              >
                <Check className="w-3.5 h-3.5" /> Approve
              </Button>
            ) : null}
          </>
        ) : null}
        {approved && onPost ? (
          <Button
            type="button"
            size="sm"
            className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={onPost}
            disabled={busy}
          >
            <Save className="w-3.5 h-3.5" /> Post Credit Note
          </Button>
        ) : null}
      </div>
    </div>
  );
}
