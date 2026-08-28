"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  /** When set, used on the closed trigger instead of `label`. Dropdown still shows `label`. */
  selectedLabel?: string;
  sub?: string;
}

export function SearchableSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  required,
  disabled,
  contentClassName,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q.toLowerCase()) ||
          (o.sub?.toLowerCase().includes(q.toLowerCase()) ?? false) ||
          (o.selectedLabel?.toLowerCase().includes(q.toLowerCase()) ?? false),
      )
    : options;
  const selected = options.find((o) => o.value === value);
  const triggerText = selected
    ? (selected.selectedLabel?.trim() || selected.label)
    : placeholder;

  return (
    <div className={cn(label ? "space-y-1" : undefined, "min-w-0")}>
      {label ? (
        <Label className="text-xs font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      ) : null}
      <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full min-w-0 h-[30px] px-2 text-xs text-left border border-border rounded-md bg-background flex items-center justify-between gap-1",
              disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            )}
          >
            <span className={cn("truncate min-w-0", selected ? "text-foreground" : "text-muted-foreground")}>
              {triggerText}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className={cn("w-[var(--radix-popover-trigger-width)] p-0", contentClassName)}
          align="start"
        >
          <div className="p-1.5 border-b">
            <Input
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 text-sm font-medium"
              autoFocus
            />
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No results</p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQ("");
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60",
                    selected?.value === opt.value && "bg-brand-50",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{opt.label}</span>
                    {opt.sub && <span className="text-xs text-muted-foreground block truncate">{opt.sub}</span>}
                  </div>
                  {selected?.value === opt.value && <Check className="w-3 h-3 text-brand-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
