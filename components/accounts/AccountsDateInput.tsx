"use client";

/** Accounts module only — do not import from Sales, Procurement, Warehouse, HR, Masters, etc. */

import React, { useRef } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { isoToDisplayDate } from "@/lib/accounts/date-display";
import { ACCOUNTS_FILTER_CONTROL_CLASS } from "@/lib/accounts/accounts-typography";

export interface AccountsDateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  /** @deprecated ignored — compact filter sizing is always used */
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
}: AccountsDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = value ? isoToDisplayDate(value) : "";

  const openPicker = (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (disabled) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    try {
      input.showPicker?.();
    } catch {
      input.click();
    }
  };

  return (
    <div
      className={cn(
        "accounts-date-filter-input relative flex items-center rounded-md border border-[#E5E7EB] bg-white text-left overflow-hidden",
        "hover:bg-muted/20 transition-colors",
        "focus-within:ring-2 focus-within:ring-brand-300 focus-within:border-brand-400",
        ACCOUNTS_FILTER_CONTROL_CLASS,
        disabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className,
      )}
    >
      <span
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker(e);
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937] transition-colors flex-shrink-0 z-[1] cursor-pointer"
        aria-label={ariaLabel ? `${ariaLabel} — open calendar` : "Open calendar"}
      >
        <Calendar className="w-3.5 h-3.5" />
      </span>
      <span
        className={cn(
          "accounts-date-display block min-w-0 pl-7 pr-1.5 w-full cursor-pointer truncate tabular-nums",
          display ? "text-[#1F2937]" : "text-[#6B7280]",
        )}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") openPicker(e);
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
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
        aria-label={ariaLabel}
        className="absolute inset-0 z-[2] opacity-0 w-full h-full cursor-pointer"
        tabIndex={-1}
      />
    </div>
  );
}
