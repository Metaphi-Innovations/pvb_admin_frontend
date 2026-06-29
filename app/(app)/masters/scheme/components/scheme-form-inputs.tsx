"use client";

import { Input } from "@/components/ui/input";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

export const schemeCompactFieldClass = "h-8 text-xs";

export const schemeNoSpinnerClass =
  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

export function parseSchemeMoneyString(raw: string): number {
  if (!raw.trim()) return 0;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

export function schemeMoneyToString(n: number): string {
  return n > 0 ? String(n) : "";
}

export function SchemeRupeeField({
  value,
  onChange,
  className,
  placeholder = "₹ 0",
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <IndianRupeeInput
      value={parseSchemeMoneyString(value)}
      onChange={(n) => onChange(schemeMoneyToString(n))}
      placeholder={placeholder}
      className={cn(
        schemeCompactFieldClass,
        "border-border shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30",
        MONEY_INPUT_CLASS,
        className,
      )}
    />
  );
}

export function SchemeNumberField({
  value,
  onChange,
  className,
  placeholder,
  min,
  max,
  step,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string | number;
}) {
  return (
    <Input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(schemeCompactFieldClass, schemeNoSpinnerClass, className)}
      onWheel={(e) => e.currentTarget.blur()}
    />
  );
}
