"use client";

import { AlertCircle } from "lucide-react";
import { COA_MAX_HIERARCHY_MESSAGE } from "@/lib/accounts/coa-hierarchy-constants";
import { cn } from "@/lib/utils";

interface CoaMaxHierarchyNoticeProps {
  className?: string;
}

/** Shown when the selected COA node is at Level 5 and cannot accept children. */
export function CoaMaxHierarchyNotice({ className }: CoaMaxHierarchyNoticeProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5",
        className,
      )}
      role="status"
    >
      <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-amber-800 leading-snug">{COA_MAX_HIERARCHY_MESSAGE}</p>
    </div>
  );
}
