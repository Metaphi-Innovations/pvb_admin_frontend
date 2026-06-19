"use client";

import type { RecordKpiItem } from "./types";

export function RecordKpiBar({ items }: { items: RecordKpiItem[] }) {
  return (
    <div
      className="grid border-t border-border"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      {items.map((item, i) => {
        const Icon = item.icon;
        const isLast = i === items.length - 1;
        return (
          <div
            key={item.label}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
            style={{ borderRight: isLast ? "none" : "1px solid hsl(var(--border))" }}
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: item.iconBg }}
            >
              <Icon className="w-4 h-4" style={{ color: item.iconColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight text-foreground tabular-nums truncate">
                {item.value}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
