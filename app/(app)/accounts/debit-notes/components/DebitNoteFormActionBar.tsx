"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TRANSACTION_FORM_CANCEL_BTN_CLASS } from "@/lib/accounts/transaction-form-phase";

const BTN = "h-8 text-xs gap-1.5";

/**
 * Debit note lifecycle action bar.
 *
 * Create: Cancel · Save as Draft · Save & Post
 * Edit draft: Cancel · Save Draft · Post
 */
export function DebitNoteFormActionBar({
  busy,
  hasExistingId = false,
  onDiscard,
  onSaveDraft,
  onSaveAndPost,
  onPost,
}: {
  busy?: boolean;
  hasExistingId?: boolean;
  onDiscard: () => void;
  onSaveDraft: () => void;
  onSaveAndPost?: () => void;
  onPost?: () => void;
}) {
  const isCreate = !hasExistingId;
  const isEditDraft = hasExistingId;

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between w-full">
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
      <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto">
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
