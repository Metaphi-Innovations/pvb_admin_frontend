"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

interface PRFormActionsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  showSubmit?: boolean;
  compact?: boolean;
}

export function PRFormActions({
  onCancel,
  onSubmit,
  readOnly,
  showSubmit = true,
  compact,
}: PRFormActionsProps) {
  if (readOnly) {
    return (
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
        Close
      </Button>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "flex-wrap"}`}>
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onCancel}>
        Cancel
      </Button>
      {showSubmit && onSubmit && (
        <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={onSubmit}>
          <Send className="w-3.5 h-3.5 mr-1" /> Submit
        </Button>
      )}
    </div>
  );
}
