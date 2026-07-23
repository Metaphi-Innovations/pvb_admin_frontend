"use client";

import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BTN = "h-8 text-xs gap-1.5";

export interface VoucherFormActionBarProps {
  onCancel: () => void;
  onSaveDraft: () => void;
  onSaveAndPost: () => void;
  cancelDisabled?: boolean;
  saveDraftDisabled?: boolean;
  saveAndPostDisabled?: boolean;
  className?: string;
}

/**
 * Standard sticky footer actions for the six Accounts voucher modules.
 * Left: Cancel · Right: Save Draft, Save & Post
 */
export function VoucherFormActionBar({
  onCancel,
  onSaveDraft,
  onSaveAndPost,
  cancelDisabled,
  saveDraftDisabled,
  saveAndPostDisabled,
  className,
}: VoucherFormActionBarProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 w-full", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(BTN, "text-muted-foreground")}
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        Cancel
      </Button>
      <div className="flex items-center gap-2">
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
          <Save className="w-3.5 h-3.5" /> Save &amp; Post
        </Button>
      </div>
    </div>
  );
}
