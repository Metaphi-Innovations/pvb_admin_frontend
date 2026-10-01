"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MONEY_INPUT_CLASS, roundMoney } from "@/lib/accounts/money-format";

/** Format for summary / blur display: -₹1.00 | +₹0.60 | ₹0.00 */
export function formatSignedRoundOff(amount: number): string {
  const n = roundMoney(Number(amount) || 0);
  const abs = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(n));
  if (n === 0) return `₹${abs}`;
  if (n < 0) return `-₹${abs}`;
  return `+₹${abs}`;
}

/** Allow digits, one decimal (max 2 places), and an optional leading minus. */
function sanitizeSignedRoundOffRaw(raw: string): string {
  let s = raw.replace(/[₹,\s]/g, "").replace(/[^\d.\-]/g, "");
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  const dotIndex = s.indexOf(".");
  if (dotIndex !== -1) {
    const intPart = s.slice(0, dotIndex);
    const decPart = s.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
    s = `${intPart}.${decPart}`;
  }
  if (s.includes(".")) {
    const [intPart, decPart = ""] = s.split(".");
    const normalizedInt = intPart.replace(/^0+(?=\d)/, "") || "0";
    s = `${normalizedInt}.${decPart}`;
  } else if (s) {
    s = s.replace(/^0+(?=\d)/, "") || "0";
  }
  if (negative) return s ? `-${s}` : "-";
  return s;
}

export function parseSignedRoundOffInput(raw: string): number {
  const sanitized = sanitizeSignedRoundOffRaw(raw);
  if (!sanitized || sanitized === "-" || sanitized === "." || sanitized === "-.") return 0;
  const n = parseFloat(sanitized);
  return Number.isFinite(n) ? roundMoney(n) : 0;
}

export interface VoucherSignedRoundOffInputProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Compact signed Round Off input for Credit / Debit Note only.
 * Supports positive, negative, and zero — does not strip the minus sign.
 */
export function VoucherSignedRoundOffInput({
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel = "Round Off",
}: VoucherSignedRoundOffInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!focused) {
      setDraft(formatSignedRoundOff(value));
    }
  }, [value, focused]);

  const displayValue = focused ? draft : formatSignedRoundOff(value);

  return (
    <Input
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={displayValue}
      placeholder="₹0.00"
      className={cn(
        "h-7 w-24 text-xs border-border/70 rounded-lg bg-white shadow-none",
        "focus-visible:ring-1 focus-visible:ring-brand-500/30",
        MONEY_INPUT_CLASS,
        "text-right",
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
        setDraft(raw);
        requestAnimationFrame(() => e.target.select());
      }}
      onBlur={() => {
        setFocused(false);
        const numeric = parseSignedRoundOffInput(draft);
        onChange(numeric);
        setDraft(formatSignedRoundOff(numeric));
      }}
      onChange={(e) => {
        const next = sanitizeSignedRoundOffRaw(e.target.value);
        setDraft(next);
        if (next === "" || next === "-" || next === "." || next === "-.") {
          onChange(0);
          return;
        }
        onChange(parseSignedRoundOffInput(next));
      }}
    />
  );
}
