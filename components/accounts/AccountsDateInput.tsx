"use client";

/** Accounts module only — do not import from Sales, Procurement, Warehouse, HR, Masters, etc. */

import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { isoToDisplayDate } from "@/lib/accounts/date-display";

export interface AccountsDateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  size?: "compact" | "default";
}

export function AccountsDateInput({
  value,
  onChange,
  className,
  placeholder = "dd-mm-yyyy",
  id,
  disabled,
  "aria-label": ariaLabel,
  size = "compact",
}: AccountsDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = value ? isoToDisplayDate(value) : "";

  const openPicker = () => {
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker?.();
    } catch {
      input.focus();
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center w-full rounded-md border border-border bg-background text-left",
        "hover:bg-muted/20 transition-colors",
        "focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-brand-400",
        size === "compact" ? "h-7" : "h-8",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
    >
      <Calendar
        className={cn(
          "absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none flex-shrink-0",
          size === "compact" ? "w-3 h-3" : "w-3.5 h-3.5",
        )}
      />
      <span
        className={cn(
          "pl-7 pr-2 truncate w-full",
          size === "compact" ? "text-xs" : "text-xs",
          display ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {display || placeholder}
      </span>
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
