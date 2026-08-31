"use client";

import { useState } from "react";
import { INVOICE_DETAIL_SELECT_CLASS } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

export interface ReceiptSearchableOption {
  value: string;
  label: string;
  sub?: string;
}

/** Receipt-scoped searchable select (does not alter Credit Note SearchableSelect). */
export function ReceiptSearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  triggerClassName,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReceiptSearchableOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q.toLowerCase()) ||
          (o.sub?.toLowerCase().includes(q.toLowerCase()) ?? false),
      )
    : options;
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn(label ? "space-y-0.5" : "w-full min-w-0")}>
      {label ? (
        <Label className="text-xs font-medium">
          {label}
          {required ? <span className="text-red-500 ml-0.5">*</span> : null}
        </Label>
      ) : null}
      <Popover
        open={open && !disabled}
        onOpenChange={(v) => {
          if (!disabled) {
            setOpen(v);
            if (!v) setQ("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full min-w-0 text-left flex items-center justify-between gap-1",
              INVOICE_DETAIL_SELECT_CLASS,
              disabled
                ? "opacity-50 cursor-not-allowed bg-muted/30"
                : "hover:bg-muted/20",
              triggerClassName,
            )}
          >
            <span
              className={cn(
                "truncate",
                selected ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {selected?.label || placeholder}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="p-1 border-b">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto py-0.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[11px] text-muted-foreground">
                No results
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={cn(
                    "w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-left hover:bg-muted/60",
                    value === o.value && "bg-brand-50",
                  )}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQ("");
                  }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate">{o.label}</span>
                    {o.sub ? (
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {o.sub}
                      </span>
                    ) : null}
                  </span>
                  {value === o.value ? (
                    <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
