"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReportFilterSummaryItem } from "@/lib/accounts/report-multi-filter-utils";

export function ReportFilterSummary({
  items,
  className,
}: {
  items: ReportFilterSummaryItem[];
  className?: string;
}) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 border-b border-border/60 bg-muted/10 text-[11px] w-full",
        className,
      )}
    >
      {visible.map((item) => (
        <span key={item.id} className="inline-flex items-center gap-1 text-muted-foreground">
          <span className="font-medium text-foreground">{item.label}:</span>
          <span>{item.value}</span>
          {item.onRemove && (
            <button
              type="button"
              onClick={item.onRemove}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item.label} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
