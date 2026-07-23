"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Switch({ checked, onCheckedChange, disabled, className, id }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onMouseDown={(e) => {
        // Prevent the button from taking focus on pointer click so no sticky
        // orange ring remains. Keyboard users still receive focus via Tab.
        if (e.button === 0) e.preventDefault();
      }}
      onClick={(e) => {
        if (disabled) return;
        onCheckedChange(!checked);
        // Label-activated clicks can still focus the control — clear pointer focus.
        // e.detail === 0 for keyboard-initiated activation (keep focus).
        if (e.detail !== 0) e.currentTarget.blur();
      }}
      className={cn(
        "relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent transition-colors duration-200",
        "outline-none",
        // Mouse / programmatic focus: never show orange ring
        "focus:outline-none focus:ring-0 focus:ring-offset-0",
        // Keyboard only: compact, subtle focus-visible
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand-600" : "bg-muted-foreground/30",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm",
          "transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
