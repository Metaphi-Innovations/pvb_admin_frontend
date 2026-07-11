"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { FileText } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  VISUAL_BADGE_CLASS,
  VISUAL_BADGE_LABEL,
  VISUAL_ICON,
  coaTreeIconClass,
  normalizeCoaVisualLevel,
  resolveCoaVisualLevel,
  COA_TREE_ICON_SIZE_CLASS,
  type CoaVisualLevel,
} from "./coa-tree-visual";

export function CoaLevelBadge({
  level,
  size = "default",
  className,
}: {
  level: CoaVisualLevel;
  size?: "default" | "sm";
  className?: string;
}) {
  const key = normalizeCoaVisualLevel(level);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-semibold leading-none flex-shrink-0",
        size === "sm" ? "text-xs px-1 py-px" : "text-xs px-2 py-0.5",
        VISUAL_BADGE_CLASS[key],
        className,
      )}
    >
      {VISUAL_BADGE_LABEL[key]}
    </span>
  );
}

/** Level-based hierarchy icon — same depth → same icon + colour everywhere in COA. */
export function CoaHierarchyLevelIcon({
  node,
  records,
  selected = false,
  className,
}: {
  node: ChartOfAccount;
  records: ChartOfAccount[];
  selected?: boolean;
  className?: string;
}) {
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon: LucideIcon = VISUAL_ICON[visualLevel] ?? FileText;
  return (
    <Icon
      className={cn(
        COA_TREE_ICON_SIZE_CLASS,
        "flex-shrink-0",
        coaTreeIconClass(visualLevel, selected),
        className,
      )}
      strokeWidth={visualLevel === "primary_head" ? 2 : 1.75}
      aria-hidden
    />
  );
}
