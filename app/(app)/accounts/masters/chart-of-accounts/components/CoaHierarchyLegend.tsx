"use client";

import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
      <TooltipContent side="right" className="max-w-[240px] text-xs p-3 space-y-1.5">
        <p className="font-semibold text-foreground">Hierarchy legend</p>
        <p>
          <span className="font-medium text-leaf-700">Level 1</span> — Primary heads (Landmark, Scale,
          TrendingUp, TrendingDown)
        </p>
        <p>
          <span className="font-medium text-foreground/90">Level 2–3</span> — Groups with contextual
          outline icons; indent shows depth
        </p>
        <p>
          <span className="font-medium text-slate-600">Ledgers</span> — BookOpen icon, slate colour;
          always leaf nodes (no expand chevron)
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
