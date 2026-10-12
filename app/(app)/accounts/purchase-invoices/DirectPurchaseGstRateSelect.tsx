"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FALLBACK_GST_RATES = [0, 5, 12, 18, 28] as const;

function normalizeRate(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

function formatRateLabel(rate: number): string {
  const n = normalizeRate(rate);
  return Number.isInteger(n) ? `${n}%` : `${n}%`;
}

export function DirectPurchaseGstRateSelect({
  value,
  onChange,
  disabled,
  className,
  rates,
}: {
  value: number;
  onChange: (rate: number) => void;
  disabled?: boolean;
  className?: string;
  /** GST % values from GST Master. Falls back to standard slabs when empty. */
  rates?: number[];
}) {
  const [open, setOpen] = useState(false);
  const current = normalizeRate(value);

  const options = useMemo(() => {
    const fromMaster = (rates ?? [])
      .map(normalizeRate)
      .filter((n) => Number.isFinite(n));
    const base = fromMaster.length > 0 ? fromMaster : [...FALLBACK_GST_RATES];
    const merged = new Set<number>(base);
    // Keep HSN-driven / saved rates visible even if not in the active master list.
    merged.add(current);
    return Array.from(merged).sort((a, b) => a - b);
  }, [rates, current]);

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
          <span className="truncate">{formatRateLabel(current)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-[120px] p-1 max-h-60 overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {options.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={() => {
              onChange(rate);
              setOpen(false);
            }}
            className={cn(
              "w-full px-2.5 py-1.5 text-left text-[13px] rounded-md tabular-nums transition-colors",
              current === rate
                ? "bg-brand-50 text-brand-700 font-semibold"
                : "text-foreground hover:bg-muted/50",
            )}
          >
            {formatRateLabel(rate)}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
