"use client";

import React, { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SCHEME_TYPES, type SchemeType } from "../scheme-data";

const SCHEME_TYPE_DESCRIPTIONS: Record<SchemeType, string> = {
  "Product Discount Scheme": "Direct discount applied on sales order lines.",
  "Product Near Expiry Scheme": "Benefit for products with batches nearing expiry.",
  "Cash Discount Scheme": "Incentive settled via credit note after sales order.",
  "Festive Discount Scheme": "Seasonal or festival campaign benefit.",
  "Turnover Discount Scheme": "Slab-based benefit on customer turnover.",
  "Payment Discount Scheme": "Outstanding settlement waiver for payment collection via CN/JV.",
};

interface SchemeTypeSelectProps {
  value: SchemeType;
  onChange: (type: SchemeType) => void;
}

export function SchemeTypeSelect({ value, onChange }: SchemeTypeSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">
          Scheme Type <span className="text-red-500">*</span>
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm",
                "hover:bg-muted/30 transition-colors text-left",
              )}
            >
              <span className="truncate text-foreground">{value}</span>
              <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] p-0"
          >
            <div className="max-h-64 overflow-y-auto p-1">
              {SCHEME_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onChange(type);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/60",
                    value === type && "bg-brand-50",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground">{type}</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                      {SCHEME_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>
                  {value === type && (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" />
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <p className="text-[11px] text-muted-foreground">
          {SCHEME_TYPE_DESCRIPTIONS[value]}
        </p>
      </div>
    </div>
  );
}
