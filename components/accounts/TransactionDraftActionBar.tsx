"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRANSACTION_FORM_CANCEL_BTN_CLASS } from "@/lib/accounts/transaction-form-phase";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Standard create/edit footer for Accounts transaction modules.
 * Create: Cancel · Save as Draft · Save & Post
 * Edit:   Cancel · Save Draft · Post
 */
export function TransactionDraftActionBar({
  busy,
  isCreate,
  onCancel,
  onSaveDraft,
  onSaveAndPost,
  onPost,
}: {
  busy?: boolean;
  isCreate: boolean;
  onCancel?: () => void;
  onSaveDraft?: () => void;
  onSaveAndPost?: () => void;
  onPost?: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TRANSACTION_FORM_CANCEL_BTN_CLASS}
            onClick={onCancel}
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
        {!isCreate && onPost ? (
          <Button
            type="button"
            size="sm"
            className={cn(BTN, "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={onPost}
            disabled={busy}
          >
            <Save className="w-3.5 h-3.5" /> Post
          </Button>
        ) : null}
      </div>
    </div>
  );
}
