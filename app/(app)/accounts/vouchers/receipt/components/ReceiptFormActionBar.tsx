"use client";

import { Check, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TRANSACTION_FORM_CANCEL_BTN_CLASS,
  transactionsApprovalActive,
} from "@/lib/accounts/transaction-form-phase";
import type { ReceiptVoucherStatus } from "@/types/receipt-voucher.types";
import { canPostStatus } from "../receipt-voucher-utils";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Receipt lifecycle action bar.
 *
 * Create: Cancel · Save as Draft · Save & Post
 * Edit draft: Cancel · Save Draft · Post
 */
export function ReceiptFormActionBar({
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
  status?: ReceiptVoucherStatus | string | null;
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
  const st = (status || "DRAFT") as ReceiptVoucherStatus;
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
    if (!posted || !onReverse) return null;
    return (
      <div className="flex items-center justify-end w-full">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
          onClick={onReverse}
          disabled={busy}
        >
          Reverse Receipt
        </Button>
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
        {canCancel && !posted && !cancelled && onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-red-600 border-red-200 hover:bg-red-50")}
            onClick={onCancel}
            disabled={busy}
          >
            <XCircle className="w-3.5 h-3.5" /> Cancel Receipt
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
            Reverse Receipt
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
            <Save className="w-3.5 h-3.5" /> Post Receipt
          </Button>
        ) : null}
      </div>
    </div>
  );
}
