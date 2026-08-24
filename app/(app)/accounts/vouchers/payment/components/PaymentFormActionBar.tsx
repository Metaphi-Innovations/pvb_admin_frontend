"use client";

import { Check, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PaymentVoucherStatus } from "@/types/payment-voucher.types";
import { canPostStatus } from "../payment-voucher-utils";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Payment lifecycle action bar.
 * PENDING_APPROVAL never shows Post — even when approval config is false.
 */
export function PaymentFormActionBar({
  status,
  busy,
  canCancel,
  approvalRequired = true,
  configReady = true,
  hasExistingId = false,
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
  status?: PaymentVoucherStatus | string | null;
  busy?: boolean;
  canCancel?: boolean;
  approvalRequired?: boolean;
  configReady?: boolean;
  hasExistingId?: boolean;
  onDiscard: () => void;
  onSaveDraft?: () => void;
  onSubmitForApproval?: () => void;
  onSaveAndPost?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPost?: () => void;
  onCancel?: () => void;
  onReverse?: () => void;
}) {
  const st = (status || "DRAFT") as PaymentVoucherStatus;
  const draftLike = st === "DRAFT" || st === "REJECTED" || !status;
  const pendingApproval = st === "PENDING_APPROVAL";
  const approved = st === "APPROVED";
  const posted = st === "POSTED";
  const cancelled = st === "CANCELLED" || st === "REVERSED";
  const bypass = configReady && approvalRequired === false;
  const allowPost = canPostStatus(st, approvalRequired);

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(BTN, "text-muted-foreground")}
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
            <XCircle className="w-3.5 h-3.5" /> Cancel Payment
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
            Reverse Payment
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col items-stretch sm:items-end gap-1 w-full sm:w-auto">
        {bypass ? (
          <p className="text-[11px] text-muted-foreground sm:text-right">
            Approval is temporarily disabled for Phase 1.
          </p>
        ) : null}
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
              {!bypass && onSubmitForApproval ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
                  onClick={onSubmitForApproval}
                  disabled={busy || !hasExistingId}
                >
                  <Send className="w-3.5 h-3.5" /> Submit for Approval
                </Button>
              ) : null}
              {bypass && onSaveAndPost ? (
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
              {bypass && !onSaveAndPost && allowPost && onPost ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
                  onClick={onPost}
                  disabled={busy}
                >
                  <Save className="w-3.5 h-3.5" /> Post Payment
                </Button>
              ) : null}
            </>
          ) : null}

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
              <Save className="w-3.5 h-3.5" /> Post Payment
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
