"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "crop" | "rotation" | "brand" | "health" | "default";

const VARIANT_CLS: Record<ChipVariant, string> = {
  crop: "border-leaf-200 bg-leaf-50 text-leaf-700",
  rotation: "border-navy-200 bg-navy-50 text-navy-700",
  brand: "border-brand-200 bg-brand-50 text-brand-700",
  health: "border-red-200 bg-red-50 text-red-700",
  default: "border-border bg-muted/30 text-foreground",
};

export function WrapChips({
  items,
  chipPrefix,
  emptyLabel = "—",
  className,
  variant = "default",
}: {
  items: string[];
  chipPrefix?: string;
  emptyLabel?: string;
  className?: string;
  variant?: ChipVariant;
}) {
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5 content-start", className)}>
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-normal",
            VARIANT_CLS[variant],
          )}
        >
          {chipPrefix && <span className="mr-0.5 flex-shrink-0">{chipPrefix}</span>}
          {item}
        </span>
      ))}
    </div>
  );
}
