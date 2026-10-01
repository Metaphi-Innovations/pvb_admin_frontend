"use client";

/**
 * Compact 12-hour time picker for HR Settings (Shift Setup, etc.).
 * Stores 24h "HH:mm" internally; displays e.g. 09:30 AM.
 */

import React, { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTime12, normalizeTime24, parseTimeTo24 } from "../settings/shift-setup-data";

function split12(time24: string): { hour: string; minute: string; period: "AM" | "PM" } | null {
  const t = normalizeTime24(time24);
  if (!t) return null;
  const [hs, ms] = t.split(":").map(Number);
  const period: "AM" | "PM" = hs >= 12 ? "PM" : "AM";
  const h12 = hs % 12 === 0 ? 12 : hs % 12;
  return {
    hour: String(h12).padStart(2, "0"),
    minute: String(ms).padStart(2, "0"),
    period,
  };
}

function join12(hour: string, minute: string, period: "AM" | "PM"): string {
  return parseTimeTo24(`${hour}:${minute} ${period}`);
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export interface HrTimeInputProps {
  value: string;
  onChange: (value24: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}

export function HrTimeInput({
  value,
  onChange,
  className,
  placeholder = "Select time",
  id,
  disabled,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: HrTimeInputProps) {
  const [open, setOpen] = useState(false);
  const parts = useMemo(() => split12(value), [value]);
  const display = value ? formatTime12(value) : "";

  const hour = parts?.hour ?? "09";
  const minute = parts?.minute ?? "00";
  const period = parts?.period ?? "AM";

  const minuteOptions = useMemo(() => {
    const set = new Set(MINUTES);
    if (parts && !set.has(parts.minute)) set.add(parts.minute);
    return Array.from(set).sort();
  }, [parts]);

  const apply = (h: string, m: string, p: "AM" | "PM") => {
    const next = join12(h, m, p);
    if (next) onChange(next);
  };

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
            "flex w-full h-9 items-center gap-2 rounded-lg border border-border bg-white px-2.5 text-left text-xs",
            "hover:bg-muted/30 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
            ariaInvalid && "border-red-400",
            disabled && "opacity-60 cursor-not-allowed",
            className,
          )}
        >
          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className={cn("flex-1 truncate", display ? "text-foreground" : "text-muted-foreground")}>
            {display || placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2.5 rounded-[12px]">
        <div className="flex items-center gap-1.5">
          <Select value={hour} onValueChange={(h) => apply(h, minute, period)}>
            <SelectTrigger className="h-8 w-[64px] text-xs rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h} className="text-xs">
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground font-medium">:</span>
          <Select value={minute} onValueChange={(m) => apply(hour, m, period)}>
            <SelectTrigger className="h-8 w-[64px] text-xs rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {minuteOptions.map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={period}
            onValueChange={(p) => apply(hour, minute, p as "AM" | "PM")}
          >
            <SelectTrigger className="h-8 w-[64px] text-xs rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AM" className="text-xs">
                AM
              </SelectItem>
              <SelectItem value="PM" className="text-xs">
                PM
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  );
}
