"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRANSACTION_FORM_CANCEL_BTN_CLASS } from "@/lib/accounts/transaction-form-phase";

const BTN = "h-8 text-xs gap-1.5";

export interface VoucherFormActionBarProps {
  /** Leave form without saving (navigate back / discard changes). */
  onDiscard: () => void;
  onSaveDraft: () => void;
  /** Optional maker-checker submit — hidden until approval phase is enabled. */
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
 * Standard sticky footer for Accounts transaction voucher forms.
 * Cancel · Save Draft · Save & Post / Approve & Post
 */
export function VoucherFormActionBar({
  onDiscard,
  onSaveDraft,
  onSaveAndPost,
  saveAndPostLabel = "Save & Post",
  discardDisabled,
  saveDraftDisabled,
  saveAndPostDisabled,
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
        variant="outline"
        size="sm"
        className={cn(TRANSACTION_FORM_CANCEL_BTN_CLASS, "self-start sm:self-auto")}
        onClick={onDiscard}
        disabled={discardDisabled}
      >
        Cancel
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
