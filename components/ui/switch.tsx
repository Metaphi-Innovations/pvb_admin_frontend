"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Accessible name when no visible label is shown. */
  "aria-label"?: string;
  /** default = 36×20 (existing). sm = 32×18 for compact HR table rows. */
  size?: "default" | "sm";
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
  size = "default",
}: SwitchProps) {
  const sm = size === "sm";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      contentEditable={false}
      onMouseDown={(e) => {
        if (e.button === 0) e.preventDefault();
      }}
      onClick={(e) => {
        if (disabled) return;
        onCheckedChange(!checked);
        if (e.detail !== 0) e.currentTarget.blur();
      }}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent transition-colors duration-200",
        "select-none caret-transparent outline-none",
        "focus:outline-none focus:ring-0 focus:ring-offset-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sm ? "h-[18px] w-[32px]" : "h-[20px] w-[36px]",
        checked ? "bg-brand-600" : "bg-muted-foreground/30",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-sm",
          "transition-transform duration-200",
          sm ? "h-3.5 w-3.5" : "h-4 w-4",
          checked ? (sm ? "translate-x-[14px]" : "translate-x-4") : "translate-x-0",
        )}
      />
    </button>
  );
}
