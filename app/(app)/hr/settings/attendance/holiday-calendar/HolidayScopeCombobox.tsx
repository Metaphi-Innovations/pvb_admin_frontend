"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const LIST_MAX_HEIGHT = 240;

export interface HolidayScopeComboboxOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Compact searchable combobox for Holiday Calendar State / Branch selectors.
 * Search input appears only inside the open dropdown — not as a second permanent field.
 */
export function HolidayScopeCombobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "Search…",
  error,
  disabled,
  "aria-label": ariaLabel,
}: {
  options: HolidayScopeComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  error?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(term) ||
        (o.hint?.toLowerCase().includes(term) ?? false),
    );
  }, [options, search]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSearch("");
      setPortalContainer(null);
      return;
    }
    const dialog = triggerRef.current?.closest('[role="dialog"]');
    setPortalContainer(dialog instanceof HTMLElement ? dialog : null);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            "w-full h-9 px-3 text-xs text-left border border-border rounded-lg bg-white",
            "flex items-center justify-between gap-2",
            "hover:bg-muted/30 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
            disabled && "opacity-60 cursor-not-allowed",
            error && "border-red-400 focus-visible:ring-red-300",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selected ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        portalContainer={portalContainer}
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] p-0 z-[400] overflow-hidden rounded-[10px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border bg-white px-2 py-1.5">
          <div className="relative flex h-8 items-center">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md bg-transparent pl-7 pr-2 text-xs outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setOpen(false);
                }
              }}
            />
          </div>
        </div>
        <div
          ref={listRef}
          className="overflow-y-auto p-1"
          style={{ maxHeight: LIST_MAX_HEIGHT }}
        >
          {filtered.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">No results found</p>
          ) : (
            filtered.map((o) => {
              const active = value === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleSelect(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors",
                    "hover:bg-muted/60",
                    active && "bg-brand-50 text-brand-700",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{o.label}</span>
                  {o.hint ? (
                    <span className="shrink-0 text-[10px] text-muted-foreground">{o.hint}</span>
                  ) : null}
                  {active ? <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" /> : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
