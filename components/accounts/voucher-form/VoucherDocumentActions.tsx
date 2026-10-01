"use client";

/**
 * Document-level workflow actions for posted / draft voucher views.
 * Frontend labels only — Reverse does not implement posting yet.
 */

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const BTN = "h-8 text-xs gap-1.5";

export interface VoucherDocumentActionsProps {
  status?: string;
  canEdit?: boolean;
  onEdit?: () => void;
  onCancelVoucher?: () => void;
  onReverseVoucher?: () => void;
  onApprove?: () => void;
  onPost?: () => void;
  /** When true, Reverse is shown for posted vouchers (may be disabled until wired). */
  showReverse?: boolean;
  reverseEnabled?: boolean;
  className?: string;
}

export function VoucherDocumentActions({
  status,
  canEdit,
  onEdit,
  onCancelVoucher,
  onReverseVoucher,
  onApprove,
  onPost,
  showReverse = true,
  reverseEnabled = false,
  className,
}: VoucherDocumentActionsProps) {
  const s = (status ?? "").toLowerCase();
  const isPosted = s === "posted" || s === "approved" || s === "processed";
  const isCancelled = s === "cancelled" || s === "rejected";
  const isDraft = s === "draft" || s === "sent_back" || s === "pending_approval";

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {canEdit && onEdit ? (
        <Button size="sm" className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")} onClick={onEdit}>
          Edit
        </Button>
      ) : null}

      {isDraft && onApprove ? (
        <Button
          size="sm"
          variant="outline"
          className={cn(BTN, "text-emerald-700 border-emerald-200")}
          onClick={onApprove}
        >
          Approve
        </Button>
      ) : null}

      {isDraft && onPost ? (
        <Button size="sm" className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")} onClick={onPost}>
          Post
        </Button>
      ) : null}

      {!isCancelled && !isPosted && onCancelVoucher ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(BTN, "text-red-600")}
          onClick={onCancelVoucher}
        >
          Cancel Voucher
        </Button>
      ) : null}

      {showReverse && isPosted && !isCancelled ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(BTN, "text-navy-700")}
                  disabled={!reverseEnabled}
                  onClick={onReverseVoucher}
                >
                  Reverse Voucher
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {reverseEnabled
                ? "Creates a linked opposite voucher for this posted entry."
                : "Reversal will create a linked opposite voucher. Backend wiring pending — label reserved for consistency."}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}
