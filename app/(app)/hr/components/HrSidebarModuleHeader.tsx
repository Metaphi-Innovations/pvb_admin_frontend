"use client";

import React, { memo } from "react";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const HrSidebarModuleHeader = memo(function HrSidebarModuleHeader({
  title,
  collapsed = false,
  onToggleCollapse,
}: {
  title: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  if (collapsed) {
    return (
      <div className="flex justify-center py-2 px-1">
        {onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-[30px] w-[30px] rounded-[10px]"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
          >
            <PanelLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-0 min-h-[40px]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">HR Module</p>
          <h2 className="text-sm font-semibold text-foreground truncate leading-tight" title={title}>
            {title}
          </h2>
        </div>
        {onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-[30px] w-[30px] rounded-[10px] shrink-0"
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>
      <div className="mx-3 mt-2 border-b border-border/80" aria-hidden />
    </>
  );
});
