"use client";

/**
 * HR module date/year/month controls — modern calendar popover for Employee Management.
 */

import React, { useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HrCalendarPopover } from "./HrCalendarPopover";
import {
  EMP_CONTROL_H,
  EMP_SELECT_CONTENT,
  EMP_SELECT_ITEM,
  EMP_SELECT_TRIGGER,
  EMP_TEXT,
} from "../employees/components/employee-form-ui";

/** ISO yyyy-mm-dd → HR display (e.g. 01 Apr 2022) */
export function formatHrDateDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return "";
  const d = new Date(`${iso.trim()}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export interface HrDateInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  min?: string;
  max?: string;
}

/** Full calendar date picker — stores ISO yyyy-mm-dd, displays HR convention. */
export function HrDateInput({
  value,
  onChange,
  className,
  placeholder = "Select date",
  id,
  disabled,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  min,
  max,
}: HrDateInputProps) {
  const [open, setOpen] = useState(false);
  const display = formatHrDateDisplay(value);

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-border bg-white px-2.5 text-left",
            EMP_CONTROL_H,
            EMP_TEXT,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50 focus-visible:border-brand-500",
            disabled && "cursor-not-allowed opacity-50",
            ariaInvalid && "border-red-400",
            className,
          )}
        >
          <Calendar size={14} className="shrink-0 text-muted-foreground" aria-hidden />
          <span
            className={cn(
              "min-w-0 flex-1 truncate tabular-nums",
              display ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {display || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2" sideOffset={4}>
        <HrCalendarPopover
          value={value}
          min={min}
          max={max}
          onSelect={(iso) => {
            onChange(iso);
            if (iso) setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface HrYearSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

/** Year-only selector for fields like Education Start/End Year. */
export function HrYearSelect({
  value,
  onChange,
  className,
  placeholder = "Select year",
  disabled,
  fromYear,
  toYear,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: HrYearSelectProps) {
  const current = new Date().getFullYear();
  const start = fromYear ?? current - 60;
  const end = toYear ?? current + 5;
  const years: string[] = [];
  for (let y = end; y >= start; y -= 1) years.push(String(y));

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          EMP_SELECT_TRIGGER,
          "w-full",
          ariaInvalid && "border-red-400",
          className,
        )}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={EMP_SELECT_CONTENT} position="popper">
        {years.map((y) => (
          <SelectItem key={y} value={y} className={EMP_SELECT_ITEM}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export interface HrMonthInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Month + year control. Value: yyyy-mm */
export function HrMonthInput({
  value,
  onChange,
  className,
  placeholder = "Select month",
  id,
  disabled,
  "aria-label": ariaLabel,
}: HrMonthInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const display = (() => {
    if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
    const [y, m] = value.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  })();

  const openPicker = () => {
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
        "relative flex items-center gap-2 rounded-lg border border-border bg-white px-2.5",
        EMP_CONTROL_H,
        EMP_TEXT,
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <button
        type="button"
        onClick={openPicker}
        tabIndex={disabled ? -1 : 0}
        className="inline-flex shrink-0 cursor-pointer items-center text-muted-foreground"
        aria-label={ariaLabel ? `${ariaLabel} — open month picker` : "Open month picker"}
        disabled={disabled}
      >
        <Calendar size={14} />
      </button>
      <button
        type="button"
        onClick={openPicker}
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 cursor-pointer truncate text-left",
          display ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {display || placeholder}
      </button>
      <input
        ref={inputRef}
        id={id}
        type="month"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );
}
