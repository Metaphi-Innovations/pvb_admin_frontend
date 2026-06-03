"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

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
    return (
      <Button variant="outline" size="sm" className="h-9 text-sm" onClick={onCancel}>
        Back to list
      </Button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 text-sm" onClick={onCancel}>
        Cancel
      </Button>
      {onSaveDraft && (
        <Button variant="outline" size="sm" className="h-9 text-sm" onClick={onSaveDraft}>
          Save as Draft
        </Button>
      )}
      {showSubmit && onSubmit && (
        <Button
          size="sm"
          className="h-9 text-sm bg-brand-600 hover:bg-brand-700 text-white px-4"
          onClick={onSubmit}
        >
          <Send className="w-4 h-4 mr-1.5" /> Submit
        </Button>
      )}
    </>
  );
}
