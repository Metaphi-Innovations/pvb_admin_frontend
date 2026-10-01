"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { GST_RATE_OPTIONS } from "./purchase-invoice-direct-utils";

export function DirectPurchaseGstRateSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (rate: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = `${value}%`;

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-8 w-full min-w-[72px] px-2.5 text-[13px] rounded-lg border border-border bg-white",
            "flex items-center justify-between gap-1.5 text-left font-medium tabular-nums",
            "hover:bg-muted/20 transition-colors",
            disabled && "opacity-60 cursor-not-allowed bg-muted/30",
            className,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-[120px] p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {GST_RATE_OPTIONS.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => {
              onChange(rate);
              setOpen(false);
            }}
            className={cn(
              "w-full px-2.5 py-1.5 text-left text-[13px] rounded-md tabular-nums transition-colors",
              value === rate
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-foreground hover:bg-muted/50",
            )}
          >
            {rate}%
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
