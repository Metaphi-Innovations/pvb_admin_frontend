"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  disabled = false,
  error = false,
  className,
  emptyMessage = "No options",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((o) => o.value === value);
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q.toLowerCase()) ||
          o.sublabel?.toLowerCase().includes(q.toLowerCase()) ||
          o.value.toLowerCase().includes(q.toLowerCase()),
      )
    : options;

  return (
    <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            error && "border-red-400",
            className,
          )}
        >
          <span className={selected ? "text-foreground" : "text-muted-foreground"}>
            {selected?.label || placeholder}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-1.5 border-b border-border">
          <Input
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-7 text-xs focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              {q ? `No results for "${q}"` : emptyMessage}
            </p>
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
                  "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                  selected?.value === opt.value && "bg-brand-50",
                )}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{opt.label}</span>
                  {opt.sublabel && (
                    <span className="text-[10px] text-muted-foreground">{opt.sublabel}</span>
                  )}
                </div>
                {selected?.value === opt.value && (
                  <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
