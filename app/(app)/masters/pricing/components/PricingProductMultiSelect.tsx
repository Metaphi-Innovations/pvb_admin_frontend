"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Search, X } from "lucide-react";
import type { AutocompleteOption } from "@/components/ui/AutocompleteSelect";

interface PricingProductMultiSelectProps {
  options: AutocompleteOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

function handleScrollableWheel(event: React.WheelEvent<HTMLElement>) {
  const current = event.currentTarget;
  if (current.scrollHeight <= current.clientHeight) return;

  const atTop = current.scrollTop <= 0;
  const atBottom = current.scrollTop + current.clientHeight >= current.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return;

  event.preventDefault();
  event.stopPropagation();
  current.scrollTop += event.deltaY;
}

export function PricingProductMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Search and select products...",
  searchPlaceholder = "Search product code, name, or SKU...",
  disabled = false,
  error = false,
  className,
}: PricingProductMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = options.filter((opt) => {
    const haystack = `${opt.label} ${opt.sublabel ?? ""} ${opt.searchText ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  const filteredValues = filtered.map((opt) => opt.value);
  const allFilteredSelected =
    filteredValues.length > 0 && filteredValues.every((id) => value.includes(id));

  const toggleValue = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      onChange(value.filter((id) => !filteredValues.includes(id)));
      return;
    }
    const merged = new Set([...value, ...filteredValues]);
    onChange([...merged]);
  };

  const triggerLabel =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((opt) => opt.value === value[0])?.label ?? "1 product selected"
        : `${value.length} products selected`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!disabled) setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full cursor-pointer items-center justify-between rounded-lg border border-border bg-white px-3 py-2 text-left text-xs shadow-sm transition-colors select-none focus:outline-none",
            open && !error ? "border-brand-500 ring-2 ring-brand-200" : "",
            error ? "border-red-400 ring-1 ring-red-200" : !open ? "hover:border-brand-300 hover:bg-muted/20" : "",
            disabled && "cursor-not-allowed bg-muted/30 opacity-50",
            className,
          )}
        >
          <span className={cn("truncate flex-1", value.length > 0 ? "text-foreground" : "text-muted-foreground")}>
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[min(100vw-2rem,32rem)] max-w-[32rem] rounded-xl border border-border bg-white p-0 shadow-lg"
        align="start"
        sideOffset={4}
      >
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="h-8 w-full rounded-lg border border-border bg-muted/10 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-[7px] rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div
          className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1.5"
          onWheelCapture={handleScrollableWheel}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                {query ? `No results for "${query}"` : "No products available"}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleAllFiltered}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-muted/60"
              >
                <Checkbox checked={allFilteredSelected} className="h-3.5 w-3.5" />
                Select All Filtered ({filtered.length})
              </button>
              <div className="my-1 border-t border-border" />
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => toggleValue(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40",
                    value.includes(opt.value) && "bg-brand-50",
                  )}
                >
                  <Checkbox checked={value.includes(opt.value)} className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="min-w-0 flex-1 text-foreground">
                    <span className="block text-xs font-medium leading-snug">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
                        {opt.sublabel}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
          <span className="text-[10px] text-muted-foreground">
            {value.length} of {options.length} selected
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
