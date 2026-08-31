"use client";

import { Check, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TRANSACTION_FORM_CANCEL_BTN_CLASS,
  transactionsApprovalActive,
} from "@/lib/accounts/transaction-form-phase";
import type { ContraVoucherStatus } from "@/types/contra-voucher.types";
import { canPostStatus } from "../contra-voucher-utils";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Contra lifecycle action bar.
 *
 * Create: Cancel · Save as Draft · Save & Post
 * Edit draft: Cancel · Save Draft · Post
 */
export function ContraFormActionBar({
  status,
  busy,
  canCancel,
  approvalRequired = true,
  configReady = true,
  hasExistingId = false,
  readOnly = false,
  onDiscard,
  onSaveDraft,
  onSubmitForApproval,
  onSaveAndPost,
  onApprove,
  onReject,
  onPost,
  onCancel,
  onReverse,
}: {
  status?: ContraVoucherStatus | string | null;
  busy?: boolean;
  canCancel?: boolean;
  approvalRequired?: boolean;
  configReady?: boolean;
  hasExistingId?: boolean;
  readOnly?: boolean;
  onDiscard?: () => void;
  onSaveDraft?: () => void;
  onSubmitForApproval?: () => void;
  onSaveAndPost?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPost?: () => void;
  onCancel?: () => void;
  onReverse?: () => void;
}) {
  const st = (status || "DRAFT") as ContraVoucherStatus;
  const draftLike = st === "DRAFT" || st === "REJECTED" || !status;
  const isCreate = draftLike && !hasExistingId;
  const isEditDraft = draftLike && hasExistingId;
  const pendingApproval = st === "PENDING_APPROVAL";
  const approved = st === "APPROVED";
  const posted = st === "POSTED";
  const cancelled = st === "CANCELLED" || st === "REVERSED";
  const approvalActive = transactionsApprovalActive(approvalRequired);
  const bypass = configReady && !approvalActive;
  const allowPost = canPostStatus(st, approvalActive);

  if (readOnly) {
    const showCancel =
      canCancel && !draftLike && !posted && !cancelled && !!onCancel;
    const showReverse = posted && !!onReverse;
    if (!showCancel && !showReverse) return null;
    return (
      <div className="flex items-center justify-end gap-2 w-full flex-wrap">
        {showCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onCancel}
            disabled={busy}
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Contra
          </Button>
        ) : null}
        {showReverse ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onReverse}
            disabled={busy}
          >
            Reverse Contra
          </Button>
        ) : null}
      </div>
    );
  }

  if (isCreate || isEditDraft) {
    return (
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
        <div className="flex items-center gap-2 flex-wrap">
          {onDiscard ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={TRANSACTION_FORM_CANCEL_BTN_CLASS}
              onClick={onDiscard}
              disabled={busy}
            >
              Cancel
            </Button>
          ) : null}
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
        {canCancel && !draftLike && !posted && !cancelled && onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onCancel}
            disabled={busy}
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Contra
          </Button>
        ) : null}
        {posted && onReverse ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onReverse}
            disabled={busy}
          >
            Reverse Contra
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

        {approved && allowPost && onPost ? (
          <Button
            type="button"
            size="sm"
            className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={onPost}
            disabled={busy}
          >
            <Save className="w-3.5 h-3.5" /> Post Contra
          </Button>
        ) : null}
      </div>
    </div>
  );
}
