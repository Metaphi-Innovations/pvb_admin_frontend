"use client";

import React, { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Fixed header collapse control — 30px, always visible in sidebar header row. */
export const AccountsSidebarCollapseButton = memo(function AccountsSidebarCollapseButton({
  collapsed,
  onToggle,
  className,
}: {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}) {
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onToggle}
          aria-label={label}
          aria-expanded={!collapsed}
          className={cn(
            "accounts-sidebar-header-collapse-btn",
            "flex items-center justify-center flex-shrink-0",
            "w-[30px] h-[30px] rounded-md border border-border bg-muted/30 shadow-sm",
            "text-foreground/70 hover:text-brand-700 hover:border-brand-400 hover:bg-brand-50",
            "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40",
            className,
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
          ) : (
            <ChevronLeft className="w-4 h-4" strokeWidth={2.25} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});
