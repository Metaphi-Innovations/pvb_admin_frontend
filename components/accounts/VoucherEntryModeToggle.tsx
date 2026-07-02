"use client";

import { cn } from "@/lib/utils";
import type { VoucherEntryMode } from "@/app/(app)/accounts/vouchers/voucher-data";

interface VoucherEntryModeToggleProps {
  value: VoucherEntryMode;
  onChange: (mode: VoucherEntryMode) => void;
  disabled?: boolean;
}

export function VoucherEntryModeToggle({
  value,
  onChange,
  disabled = false,
}: VoucherEntryModeToggleProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">Entry Mode</p>
      <div
        className={cn(
          "inline-flex rounded-lg border border-border p-0.5 bg-muted/30",
          disabled && "opacity-70",
        )}
        role="radiogroup"
        aria-label="Entry mode"
      >
        {(
          [
            { id: "simple" as const, label: "Simple Entry" },
            { id: "double" as const, label: "Double Entry" },
          ] as const
        ).map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.id)}
              className={cn(
                "h-7 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                active
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                disabled && "cursor-default",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
