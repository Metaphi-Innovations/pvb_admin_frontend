"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

export interface ContraSearchableOption {
  value: string;
  label: string;
  sub?: string;
  disabled?: boolean;
}

export function ContraSearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  onSearchChange,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ContraSearchableOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  onSearchChange?: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = onSearchChange
    ? options
    : q
      ? options.filter(
          (o) =>
            o.label.toLowerCase().includes(q.toLowerCase()) ||
            (o.sub?.toLowerCase().includes(q.toLowerCase()) ?? false),
        )
      : options;
  const selected = options.find((o) => o.value === value);

  return (
    <div className={label ? "space-y-1" : undefined}>
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
            if (!v) {
              setQ("");
              onSearchChange?.("");
            }
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between",
              disabled
                ? "opacity-50 cursor-not-allowed bg-muted/30"
                : "hover:bg-muted/30",
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
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <div className="p-1.5 border-b">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => {
                const next = e.target.value;
                setQ(next);
                onSearchChange?.(next);
              }}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                No results
              </p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  disabled={o.disabled}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-muted/60",
                    value === o.value && "bg-brand-50",
                    o.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
                  )}
                  onClick={() => {
                    if (o.disabled) return;
                    onChange(o.value);
                    setOpen(false);
                    setQ("");
                    onSearchChange?.("");
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
