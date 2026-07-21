"use client";

import { cn } from "@/lib/utils";

/** Swipe-style compact Yes/No toggle */
export function CompactToggle({
  checked,
  onCheckedChange,
  disabled,
  activeLabel = "Yes",
  inactiveLabel = "No",
  showLabel = true,
  className,
}: {
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  disabled?: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onCheckedChange(!checked);
      }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200",
        showLabel ? "h-6 w-[52px]" : "h-5 w-9",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50",
        checked ? "bg-brand-600" : "bg-slate-300",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {showLabel ? (
        <span
          className={cn(
            "absolute text-[10px] font-semibold leading-none select-none z-[1]",
            checked ? "left-2 text-white" : "right-2 text-slate-600",
          )}
        >
          {checked ? activeLabel : inactiveLabel}
        </span>
      ) : null}
      <span
        className={cn(
          "absolute rounded-full bg-white shadow-sm transition-transform duration-200",
          showLabel
            ? cn("top-0.5 h-5 w-5", checked ? "translate-x-[30px]" : "translate-x-0.5")
            : cn("top-0.5 h-4 w-4", checked ? "translate-x-[18px]" : "translate-x-0.5"),
        )}
      />
    </button>
  );
}

export function ActiveInactiveToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <CompactToggle
      checked={active}
      onCheckedChange={onChange}
      disabled={disabled}
      activeLabel="On"
      inactiveLabel="Off"
    />
  );
}
