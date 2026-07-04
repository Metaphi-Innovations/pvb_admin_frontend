"use client";

import { cn } from "@/lib/utils";
import { VISUAL_BADGE_CLASS, VISUAL_BADGE_LABEL, type CoaVisualLevel } from "./coa-tree-visual";

export function CoaLevelBadge({
  level,
  size = "default",
  className,
}: {
  level: CoaVisualLevel;
  size?: "default" | "sm";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-semibold leading-none flex-shrink-0",
        size === "sm" ? "text-xs px-1 py-px" : "text-xs px-2 py-0.5",
        VISUAL_BADGE_CLASS[level],
        className,
      )}
    >
      {VISUAL_BADGE_LABEL[level]}
    </span>
  );
}
