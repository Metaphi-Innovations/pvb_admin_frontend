"use client";

import React from "react";
import { Send } from "lucide-react";
import { ProcButton } from "../../design/proc-design";

export function PRFormFooter({
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
    return <ProcButton variant="outline" onClick={onCancel}>Back to list</ProcButton>;
  }
  return (
    <>
      <ProcButton variant="ghost" onClick={onCancel}>Cancel</ProcButton>
      {onSaveDraft && <ProcButton variant="outline" onClick={onSaveDraft}>Save as Draft</ProcButton>}
      {showSubmit && onSubmit && (
        <ProcButton variant="success" onClick={onSubmit}><Send className="w-3.5 h-3.5" /> Submit</ProcButton>
      )}
    </>
  );
}
