"use client";

import { Input } from "@/components/ui/input";
import { formatSignedRoundOff } from "@/components/accounts/voucher-form/VoucherSignedRoundOffInput";
import { MONEY_INPUT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";

/**
 * Read-only Round Off control that keeps the old input footprint
 * while showing the automatically calculated signed amount.
 */
export function AutoRoundOffDisplay({
  value,
  className,
  "aria-label": ariaLabel = "Round Off",
}: {
  value: number;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <Input
      aria-label={ariaLabel}
      readOnly
      tabIndex={-1}
      value={formatSignedRoundOff(value)}
      className={cn(
        "h-7 w-24 text-xs border-border/70 rounded-lg bg-muted/30 shadow-none",
        "focus-visible:ring-0 cursor-default",
        MONEY_INPUT_CLASS,
        "text-right",
        className,
      )}
    />
  );
}
