"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ChipListWithMoreProps {
  items: string[];
  maxVisible?: number;
  modalTitle?: string;
  emptyLabel?: string;
  size?: "sm" | "md";
  className?: string;
  chipPrefix?: string;
  /** Show total count next to section label, e.g. "Current Crops (20)" */
  showCount?: boolean;
}

export function ChipListWithMore({
  items,
  maxVisible = 2,
  modalTitle = "All Items",
  emptyLabel = "—",
  size = "sm",
  className,
  chipPrefix,
  showCount = false,
}: ChipListWithMoreProps) {
  const [open, setOpen] = useState(false);
  const visible = items.slice(0, maxVisible);
  const hiddenCount = items.length - visible.length;
  const total = items.length;

  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  const chipCls = cn(
    "inline-flex items-center rounded-full border font-medium max-w-[140px]",
    size === "sm"
      ? "px-2 py-0.5 text-xs border-brand-200 bg-brand-50 text-brand-700"
      : "px-2.5 py-1 text-xs border-brand-200 bg-brand-50 text-brand-700",
  );

  const chipLabel = (item: string) => (
    <>
      {chipPrefix && <span className="mr-0.5 flex-shrink-0">{chipPrefix}</span>}
      <span className="truncate">{item}</span>
    </>
  );

  return (
    <>
      {showCount && (
        <p className="text-[10px] text-muted-foreground mb-1 tabular-nums">
          {total} {total === 1 ? "item" : "items"}
        </p>
      )}

      <div className={cn("flex flex-wrap items-center gap-1", className)}>
        {visible.map((item) => (
          <span key={item} className={chipCls} title={item}>
            {chipLabel(item)}
          </span>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              chipCls,
              "cursor-pointer border-navy-200 bg-navy-50 text-navy-700 hover:bg-navy-100 transition-colors max-w-none",
            )}
          >
            +{hiddenCount} More
          </button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{modalTitle}</DialogTitle>
            <DialogDescription className="text-xs">
              {total} {total === 1 ? "entry" : "entries"} from SFA mobile submission
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(320px,50vh)] overflow-y-auto pr-1 -mr-1">
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item}
                  className={cn(chipCls, "text-xs max-w-[200px]")}
                  title={item}
                >
                  {chipLabel(item)}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
