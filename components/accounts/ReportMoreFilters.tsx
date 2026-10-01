"use client";

import { SlidersHorizontal } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

export function ReportMoreFilters({
  activeCount,
  children,
  className,
}: {
  activeCount: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5 flex-shrink-0", className)}>
      <span className={cn(ACCOUNTS_FILTER_LABEL_CLASS, "invisible select-none")} aria-hidden>
        More Filters
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
              activeCount > 0
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            More Filters
            {activeCount > 0 && (
              <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-3 space-y-3 max-h-[70vh] overflow-y-auto">
          {children}
        </PopoverContent>
      </Popover>
    </div>
  );
}
