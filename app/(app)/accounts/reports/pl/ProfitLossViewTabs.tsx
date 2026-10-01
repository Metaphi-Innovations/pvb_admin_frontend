"use client";

import { cn } from "@/lib/utils";
import type { PandLTab } from "./pl-data";

const TABS: { id: PandLTab; label: string }[] = [
  { id: "normal", label: "Normal Report" },
  { id: "detailed", label: "Detailed Report" },
];

export function ProfitLossViewTabs({
  value,
  onChange,
}: {
  value: PandLTab;
  onChange: (tab: PandLTab) => void;
}) {
  return (
    <div className="flex items-end gap-0 border-b border-border">
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-4 py-2 text-xs transition-colors whitespace-nowrap",
              "border-b-2 -mb-px",
              active
                ? "border-brand-600 bg-brand-50 text-brand-700 font-bold"
                : "border-transparent bg-white text-muted-foreground font-medium hover:text-foreground hover:bg-muted/30",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export function profitLossViewLabel(tab: PandLTab): string {
  return tab === "normal" ? "Normal Report" : "Detailed Report";
}
