"use client";

import { FileText, HelpCircle } from "lucide-react";
import {
  COA_HIERARCHY_LEVEL_LABELS,
  COA_MAX_HIERARCHY_LEVEL,
} from "@/lib/accounts/coa-hierarchy-constants";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  VISUAL_BADGE_LABEL,
  VISUAL_ICON,
  VISUAL_ICON_BG_CLASS,
  VISUAL_ICON_CLASS,
  type CoaVisualLevel,
} from "./coa-tree-visual";

const LEGEND_LEVELS: CoaVisualLevel[] = [
  "primary_head",
  "account_group",
  "sub_group",
  "ledger",
  "sub_ledger",
];

const LEGEND_LEVEL_NUM: Record<CoaVisualLevel, number> = {
  primary_head: 1,
  account_group: 2,
  sub_group: 3,
  ledger: 4,
  sub_ledger: 5,
};

function LegendRow({ level }: { level: CoaVisualLevel }) {
  const Icon = VISUAL_ICON[level] ?? FileText;
  const num = LEGEND_LEVEL_NUM[level];
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0",
          VISUAL_ICON_BG_CLASS[level],
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", VISUAL_ICON_CLASS[level])} strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="font-medium text-foreground">Level {num}</span>
        <span className="text-muted-foreground"> — {VISUAL_BADGE_LABEL[level]}</span>
      </span>
    </div>
  );
}

/** Compact hierarchy legend for the COA sidebar tree. */
export function CoaHierarchyLegend() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
          aria-label="Chart of accounts hierarchy legend"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[280px] text-xs p-3 space-y-2">
        <p className="font-semibold text-foreground">
          Hierarchy legend (max {COA_MAX_HIERARCHY_LEVEL} levels)
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Icon and colour reflect tree depth only — the same level always looks the same across the
          entire chart.
        </p>
        {LEGEND_LEVELS.map((level) => (
          <LegendRow key={level} level={level} />
        ))}
        <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/60">
          {COA_HIERARCHY_LEVEL_LABELS[5]} is the posting leaf — no further children allowed.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
