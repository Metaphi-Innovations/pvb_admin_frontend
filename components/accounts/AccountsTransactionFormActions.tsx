"use client";

import { Save, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";

export interface AccountsTransactionFormActionsProps {
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSaveAndView?: () => void;
  onSaveAndBack?: () => void;
  onPost?: () => void;
  saving?: boolean;
  posting?: boolean;
  postLabel?: string;
  draftLabel?: string;
  className?: string;
}

/** Standard transaction form action bar — consistent button order and sizing. */
export function AccountsTransactionFormActions({
  onCancel,
  onSaveDraft,
  onSaveAndView,
  onSaveAndBack,
  onPost,
  saving = false,
  posting = false,
  postLabel = "Post",
  draftLabel = "Save Draft",
  className,
}: AccountsTransactionFormActionsProps) {
  const busy = saving || posting;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs font-medium"
        onClick={onCancel}
        disabled={busy}
      >
        Cancel
      </Button>
      {onSaveDraft ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={onSaveDraft}
          disabled={busy}
        >
          <Save className="w-3.5 h-3.5" />
          {draftLabel}
        </Button>
      ) : null}
      {onSaveAndBack ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium"
          onClick={onSaveAndBack}
          disabled={busy}
        >
          Save & Back to List
        </Button>
      ) : null}
      {onSaveAndView ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium gap-1.5"
          onClick={onSaveAndView}
          disabled={busy}
        >
          <Save className="w-3.5 h-3.5" />
          Save & View
        </Button>
      ) : null}
      {onPost ? (
        <Button
          type="button"
          size="sm"
          className={cn(
            ACCOUNTS_ACTION_BUTTON_CLASS,
            "gap-1.5 bg-brand-600 hover:bg-brand-700 text-white border-0",
          )}
          onClick={onPost}
          disabled={busy}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {posting ? "Posting…" : postLabel}
        </Button>
      ) : null}
    </div>
  );
}
