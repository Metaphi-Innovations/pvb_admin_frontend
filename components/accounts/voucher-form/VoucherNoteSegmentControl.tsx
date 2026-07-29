"use client";

import { cn } from "@/lib/utils";

export interface VoucherNoteSegmentOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export interface VoucherNoteSegmentControlProps<T extends string> {
  label?: string;
  value: T;
  options: VoucherNoteSegmentOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
  name?: string;
  className?: string;
}

/**
 * Compact segmented / radio control for Note Type and Reference Type
 * on Credit Note and Debit Note only.
 */
export function VoucherNoteSegmentControl<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  hideLabel,
  name = "voucher-note-segment",
  className,
}: VoucherNoteSegmentControlProps<T>) {
  return (
    <div className={cn("cdn-segment space-y-1 min-w-0", className)}>
      {label && !hideLabel ? (
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      ) : null}
      <div
        className="inline-flex flex-wrap items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/20"
        role="radiogroup"
        aria-label={label || name}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={opt.description}
              disabled={disabled}
              onClick={() => {
                if (!disabled && !active) onChange(opt.value);
              }}
              className={cn(
                "h-[26px] px-2 text-[11px] font-medium rounded-md transition-colors",
                "disabled:opacity-60 disabled:cursor-not-allowed",
                active
                  ? "bg-white text-brand-700 shadow-sm border border-brand-200"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
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
