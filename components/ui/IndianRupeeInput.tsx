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
}

export function IndianRupeeInput({
  value,
  onChange,
  disabled,
  className,
  placeholder = "₹ 0",
  id,
  "aria-label": ariaLabel,
}: IndianRupeeInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) {
      setDraft(formatIndianRupeeDisplay(value));
    }
  }, [value, focused]);

  const displayValue = focused ? draft : formatIndianRupeeDisplay(value);

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
        const raw =
          value === 0
            ? ""
            : String(value).includes(".")
              ? String(value)
              : String(Math.trunc(value));
        setDraft(raw ? formatIndianRupeeWhileTyping(raw) : "");
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const numeric = parseIndianRupeeInput(draft);
        onChange(numeric);
        setDraft(formatIndianRupeeDisplay(numeric));
      }}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(formatIndianRupeeWhileTyping(next));
        onChange(parseIndianRupeeInput(next));
      }}
    />
  );
}
