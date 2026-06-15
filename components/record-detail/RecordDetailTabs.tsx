"use client";

import { cn } from "@/lib/utils";
import type { RecordDetailTab } from "./types";

export function RecordDetailTabs({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: RecordDetailTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
}) {
  return (
    <div className="flex items-end gap-0 border-b border-border px-5 overflow-x-auto">
      {tabs.map((tab) => {
        const active = tab.value === activeTab;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative flex items-center gap-1.5 px-4 py-2.5 text-xs whitespace-nowrap transition-colors",
              active
                ? "font-semibold text-brand-700"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums",
                  active ? "bg-brand-50 text-brand-700" : "bg-muted text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
