"use client";

import React from "react";
import { FolderTree } from "lucide-react";

export function CoaDrillDownEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
        <FolderTree className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-semibold text-foreground">Select an account group or ledger</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Expand primary heads in the tree using the chevron, then click a group or ledger to view
          details and transactions here.
        </p>
      </div>
    </div>
  );
}
