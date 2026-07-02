"use client";

import { cn } from "@/lib/utils";

export interface AccountsSummaryItem {
  label: string;
  value: string;
  warn?: boolean;
}

export function AccountsSummaryBar({
  items,
  className,
}: {
  items: AccountsSummaryItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-1 px-2 py-1 border-b border-border/60 bg-muted/5",
        className,
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col justify-center px-2 py-1 rounded border border-border/50 bg-white min-h-[36px]",
            item.warn && "border-red-200 bg-red-50/50",
          )}
        >
          <p className="text-[10px] font-medium text-muted-foreground leading-none">{item.label}</p>
          <p
            className={cn(
              "text-xs font-bold tabular-nums leading-tight mt-0.5 truncate",
              item.warn ? "text-red-700" : "text-foreground",
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
