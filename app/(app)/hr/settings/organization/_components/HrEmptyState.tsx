"use client";

import React from "react";
import { Inbox, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HrEmptyState({
  title = "No records yet",
  description = "Add your first entry to get started.",
  actionLabel,
  onAction,
}: {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 px-4">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <Inbox className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground text-center max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button
          size="sm"
          className="mt-2 h-8 text-xs rounded-md bg-brand-600 hover:bg-brand-700 text-white"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function HrNoResultsState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 px-4">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <SearchX className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground">No matching records</p>
      <p className="text-xs text-muted-foreground">Try adjusting search or filters.</p>
      <button type="button" onClick={onClear} className="text-xs text-brand-600 hover:underline mt-1">
        Clear filters
      </button>
    </div>
  );
}

export function HrLoadingRows({ cols = 6, rows = 4 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border/60">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-2.5">
              <div
                className={cn(
                  "h-3 bg-muted animate-pulse rounded",
                  c === 0 ? "w-28" : "w-20",
                )}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
