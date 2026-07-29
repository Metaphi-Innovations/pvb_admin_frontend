"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  formatIndianRupeeDisplay,
  formatIndianRupeeWhileTyping,
  parseIndianRupeeInput,
} from "@/lib/currency/indian-rupee";
import { MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";

export interface IndianRupeeInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  /** When set, values above this are rejected (input stays at the previous allowed value). */
  max?: number;
  /** When set, values below this are clamped up on commit. */
  min?: number;
}

function clampMoney(value: number, min?: number, max?: number): number {
  let next = Number.isFinite(value) ? value : 0;
  if (min !== undefined && next < min) next = min;
  if (max !== undefined && next > max) next = max;
  return next;
}

export function IndianRupeeInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = "₹ 0",
  id,
  "aria-label": ariaLabel,
  max,
  min = 0,
}: IndianRupeeInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) {
      setDraft(formatIndianRupeeDisplay(clampMoney(value, min, max)));
    }
  }, [value, focused, min, max]);

  const displayValue = focused ? draft : formatIndianRupeeDisplay(clampMoney(value, min, max));

  return (
    <Input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={displayValue}
      placeholder={placeholder}
      className={cn(
        "h-9 text-sm border-border/70 rounded-lg bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30",
        MONEY_INPUT_CLASS,
        className,
      )}
      onFocus={(e) => {
        setFocused(true);
        const clamped = clampMoney(value, min, max);
        const raw =
          clamped === 0
            ? ""
            : String(clamped).includes(".")
              ? String(clamped)
              : String(Math.trunc(clamped));
        setDraft(raw ? formatIndianRupeeWhileTyping(raw) : "");
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const numeric = clampMoney(parseIndianRupeeInput(draft), min, max);
        onChange(numeric);
        setDraft(formatIndianRupeeDisplay(numeric));
      }}
      onChange={(e) => {
        const next = e.target.value;
        const numeric = parseIndianRupeeInput(next);
        // Reject keystrokes / paste that would exceed max (same idea as pack size / unit per case).
        if (max !== undefined && numeric > max) {
          return;
        }
        if (min !== undefined && numeric < min && next.trim() !== "" && numeric !== 0) {
          return;
        }
        setDraft(formatIndianRupeeWhileTyping(next));
        onChange(numeric);
      }}
    />
  );
}
