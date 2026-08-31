"use client";

import { cn } from "@/lib/utils";

export type BankReconWorkspaceMode = "manual" | "statement";

export function BankReconModeSwitch({
  mode,
  onChange,
}: {
  mode: BankReconWorkspaceMode;
  onChange: (mode: BankReconWorkspaceMode) => void;
}) {
  return (
    <div
      className="inline-flex h-8 items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 flex-shrink-0"
      role="tablist"
      aria-label="Reconciliation mode"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === "manual"}
        onClick={() => onChange("manual")}
        className={cn(
          "h-7 px-3 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap",
          mode === "manual"
            ? "bg-white text-brand-700 shadow-xs border border-brand-200"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Manual Reconciliation
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "statement"}
        onClick={() => onChange("statement")}
        className={cn(
          "h-7 px-3 text-[11px] font-semibold rounded-md transition-colors whitespace-nowrap",
          mode === "statement"
            ? "bg-white text-brand-700 shadow-xs border border-brand-200"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Statement Reconciliation
      </button>
    </div>
  );
}
