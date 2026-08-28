"use client";

import { Check, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TRANSACTION_FORM_CANCEL_BTN_CLASS,
  transactionsApprovalActive,
} from "@/lib/accounts/transaction-form-phase";
import type { CreditNoteStatus } from "../credit-note-form-types";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Credit note lifecycle action bar.
 *
 * Create: Cancel · Save as Draft · Save & Post
 * Edit draft: Cancel · Save Draft · Post
 */
export function CreditNoteFormActionBar({
  status,
  busy,
  canCancel,
  approvalRequired = true,
  configReady = true,
  hasExistingId = false,
  onDiscard,
  onSaveDraft,
  onSaveAndPost,
  onApprove,
  onReject,
  onPost,
  onCancel,
}: {
  status?: CreditNoteStatus | string | null;
  busy?: boolean;
  canCancel?: boolean;
  approvalRequired?: boolean;
  configReady?: boolean;
  hasExistingId?: boolean;
  onDiscard: () => void;
  onSaveDraft?: () => void;
  onSaveAndPost?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPost?: () => void;
  onCancel?: () => void;
}) {
  const st = status || "DRAFT";
  const draftLike = st === "DRAFT" || st === "REJECTED" || !status;
  const isCreate = draftLike && !hasExistingId;
  const isEditDraft = draftLike && hasExistingId;
  const pendingApproval = st === "PENDING_APPROVAL";
  const approved = st === "APPROVED";
  const posted = st === "POSTED";
  const cancelled = st === "CANCELLED" || st === "REVERSED";
  const approvalActive = transactionsApprovalActive(approvalRequired);
  const bypass = configReady && !approvalActive;

  if (isCreate || isEditDraft) {
    return (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(TRANSACTION_FORM_CANCEL_BTN_CLASS, "self-start sm:self-auto")}
            onClick={onDiscard}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
          {onSaveDraft ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={BTN}
              onClick={onSaveDraft}
              disabled={busy}
            >
              <Save className="w-3.5 h-3.5" /> {isCreate ? "Save as Draft" : "Save Draft"}
            </Button>
          ) : null}
          {isCreate && onSaveAndPost ? (
            <Button
              type="button"
              size="sm"
              className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
              onClick={onSaveAndPost}
              disabled={busy}
            >
              <Save className="w-3.5 h-3.5" /> Save & Post
            </Button>
          ) : null}
          {isEditDraft && (onPost || onSaveAndPost) ? (
            <Button
              type="button"
              size="sm"
              className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
              onClick={onPost ?? onSaveAndPost}
              disabled={busy}
            >
              <Save className="w-3.5 h-3.5" /> Post
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <div className="flex items-center gap-2 flex-wrap">
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
        {pendingApproval && !bypass ? (
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
        {pendingApproval && bypass && onPost ? (
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
