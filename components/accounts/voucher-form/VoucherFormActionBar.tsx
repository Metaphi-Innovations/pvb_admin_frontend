"use client";

import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BTN = "h-8 text-xs gap-1.5";

export interface VoucherFormActionBarProps {
  /** Discard unsaved form (not Cancel Voucher). */
  onDiscard: () => void;
  onSaveDraft: () => void;
  /** Optional maker-checker submit. */
  onSubmitForApproval?: () => void;
  /**
   * Primary post action for authorized users.
   * Label defaults to "Save & Post"; pass "Approve & Post" when checker posts.
   */
  onSaveAndPost: () => void;
  /** Defaults to "Save & Post". Invoices may pass "Post Invoice", etc. */
  saveAndPostLabel?: string;
  discardDisabled?: boolean;
  saveDraftDisabled?: boolean;
  submitForApprovalDisabled?: boolean;
  saveAndPostDisabled?: boolean;
  showSubmitForApproval?: boolean;
  className?: string;
}

/**
 * Standard sticky footer for the six Accounts voucher modules.
 * Discard Form · Save Draft · [Submit for Approval] · Save & Post / Approve & Post
 *
 * Document-level Cancel Voucher / Reverse Voucher belong on the view screen, not here.
 */
export function VoucherFormActionBar({
  onDiscard,
  onSaveDraft,
  onSubmitForApproval,
  onSaveAndPost,
  saveAndPostLabel = "Save & Post",
  discardDisabled,
  saveDraftDisabled,
  submitForApprovalDisabled,
  saveAndPostDisabled,
  showSubmitForApproval = false,
  className,
}: VoucherFormActionBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(BTN, "text-muted-foreground self-start sm:self-auto")}
        onClick={onDiscard}
        disabled={discardDisabled}
      >
        Discard Form
      </Button>
      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={BTN}
          onClick={onSaveDraft}
          disabled={saveDraftDisabled}
        >
          <Save className="w-3.5 h-3.5" /> Save Draft
        </Button>
        {showSubmitForApproval && onSubmitForApproval ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(BTN, "text-navy-700 border-navy-200")}
            onClick={onSubmitForApproval}
            disabled={submitForApprovalDisabled}
          >
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
          onClick={onSaveAndPost}
          disabled={saveAndPostDisabled}
        >
          <Save className="w-3.5 h-3.5" /> {saveAndPostLabel}
        </Button>
      </div>
    </div>
  );
}
