"use client";

import { IndianRupeeInput, type IndianRupeeInputProps } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";

function toAmount(value: number | string | undefined | null): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const n = parseFloat(String(value).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export interface AccountsMoneyInputProps
  extends Omit<IndianRupeeInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number) => void;
  /** Compact h-8 text-xs styling for accounts forms (default: true) */
  compact?: boolean;
}

/** Standard currency input for the Accounts module — ₹ prefix, en-IN commas, clears default 0 on focus. */
export function AccountsMoneyInput({
  value,
  onChange,
  compact = true,
  className,
  ...props
}: AccountsMoneyInputProps) {
  return (
    <IndianRupeeInput
      value={toAmount(value)}
      onChange={onChange}
      className={cn(compact && "h-8 text-xs", className)}
      {...props}
    />
  );
}
