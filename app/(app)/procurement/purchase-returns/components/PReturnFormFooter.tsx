"use client";

import React from "react";
import { Send, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PReturnFormFooter({
  readOnly,
  onCancel,
  onSaveDraft,
  onSubmit,
  showSubmit = true,
}: {
  readOnly?: boolean;
  onCancel: () => void;
  onSaveDraft?: () => void;
  onSubmit?: () => void;
  showSubmit?: boolean;
}) {
  if (readOnly) {
    return (
      <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold" onClick={onCancel}>
        Back to list
      </Button>
    );
  }
  return (
    <>
      <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold" onClick={onCancel}>
        Cancel
      </Button>
      {onSaveDraft && (
        <Button
          className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
          onClick={onSaveDraft}
        >
          <Save className="h-3.5 w-3.5" /> Save Draft
        </Button>
      )}
      {showSubmit && onSubmit && (
        <Button
          className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
          onClick={onSubmit}
        >
          <Send className="h-3.5 w-3.5" /> Submit Purchase Return
        </Button>
      )}
    </>
  );
}
