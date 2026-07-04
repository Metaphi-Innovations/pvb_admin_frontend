"use client";

import { cn } from "@/lib/utils";

export interface NoteTypeOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export function NoteTypeSelector<T extends string>({
  label = "Note Type",
  value,
  options,
  onChange,
  disabled,
}: {
  label?: string;
  value: T;
  options: NoteTypeOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "h-8 px-3 text-xs font-medium rounded-lg border transition-colors text-left",
                active
                  ? "border-brand-500 bg-brand-50 text-brand-800"
                  : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                disabled && "opacity-50 cursor-not-allowed",
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
