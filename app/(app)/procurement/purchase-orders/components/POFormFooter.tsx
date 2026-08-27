"use client";

import React from "react";
import { Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function POFormFooter({
  readOnly,
  onCancel,
  onSaveDraft,
  onSubmit,
  showSubmit = true,
  saveLabel = "Draft",
  submitLabel = "Submit PO",
  saving = false,
}: {
  readOnly?: boolean;
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  showSubmit?: boolean;
  saveLabel?: string;
  submitLabel?: string;
  saving?: boolean;
}) {
  if (readOnly) {
    return (
      <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold" onClick={onCancel}>
        Back to list
      </Button>
    );
  }

  const canSubmit = Boolean(showSubmit && onSubmit);
  const draftBtnClass = canSubmit
    ? "h-9 gap-1.5 rounded-lg text-xs font-semibold"
    : "h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700";

  return (
    <>
      <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold" onClick={onCancel} disabled={saving}>
        Discard
      </Button>
      {onSaveDraft && (
        <Button
          variant={canSubmit ? "outline" : "default"}
          className={draftBtnClass}
          onClick={onSaveDraft}
          disabled={saving}
        >
          <Save className="h-3.5 w-3.5" /> {saving && !canSubmit ? "Saving…" : saveLabel}
        </Button>
      )}
      {canSubmit && (
        <Button
          className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
          onClick={onSubmit}
          disabled={saving}
        >
          <Send className="h-3.5 w-3.5" /> {saving ? "Submitting…" : submitLabel}
        </Button>
      )}
    </>
  );
}
