"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Compact icon-only action for HR Settings tables/toolbars.
 * Always visible (never opacity-0 / hover-reveal).
 */
export function HrIconActionButton({
  label,
  onClick,
  children,
  disabled,
  destructive,
  className,
}: {
  /** Tooltip + aria-label */
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** Soft red treatment for delete/archive */
  destructive?: boolean;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.(e);
            }}
            className={cn(
              "h-8 w-8 inline-flex items-center justify-center rounded-lg border border-transparent",
              "bg-transparent text-slate-600",
              "hover:bg-muted hover:text-slate-800 hover:border-border",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              "disabled:opacity-40 disabled:pointer-events-none disabled:hover:bg-transparent disabled:hover:border-transparent",
              "transition-colors",
              destructive &&
                "text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-100",
              className,
            )}
          >
            <span className="[&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0">{children}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-[11px]">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
