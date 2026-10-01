"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CoaTreeNodeLabelProps {
  name: string;
  className?: string;
  /** Show tooltip only when text is truncated (default: always on hover for long names). */
  showTooltip?: boolean;
}

export function CoaTreeNodeLabel({
  name,
  className,
  showTooltip = true,
}: CoaTreeNodeLabelProps) {
  const label = (
    <span
      data-coa-tree-label
      className={cn("block min-w-0 flex-1 truncate leading-tight", className)}
    >
      {name}
    </span>
  );

  if (!showTooltip) return label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {label}
      </TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-[min(20rem,70vw)] text-xs">
        {name}
      </TooltipContent>
    </Tooltip>
  );
}
