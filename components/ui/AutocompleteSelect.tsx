"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";

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

// Option item configuration interface
export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
  searchText?: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
  disabled?: boolean;
}

interface AutocompleteSelectProps {
  options: AutocompleteOption[];
  value: string | string[];
  onChange: (value: any) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: boolean;
  multiple?: boolean;
  className?: string;
  /** Extra classes on the dropdown panel (e.g. min-w for narrow table cells). */
  popoverClassName?: string;
  renderTriggerLabel?: (selectedOptions: AutocompleteOption | AutocompleteOption[]) => React.ReactNode;
}

export function AutocompleteSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  error = false,
  multiple = false,
  className,
  popoverClassName,
  renderTriggerLabel,
}: AutocompleteSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = options.filter((opt) => {
    const haystack = `${opt.label} ${opt.sublabel ?? ""} ${opt.searchText ?? ""}`.toLowerCase();
    return haystack.includes(q.toLowerCase());
  });

  const handleSelect = (val: string) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(val)) {
        onChange(currentValues.filter((v) => v !== val));
      } else {
        onChange([...currentValues, val]);
      }
    } else {
      onChange(val);
      setOpen(false);
      setQ("");
    }
  };

  const isSelected = (val: string) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(val);
    }
    return value === val;
  };

  // Get selected labels for display
  const getSelectedLabel = () => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      if (renderTriggerLabel) {
        const selectedOpts = options.filter((o) => currentValues.includes(o.value));
        return renderTriggerLabel(selectedOpts);
      }
      return currentValues.length > 0
        ? `${currentValues.length} selected`
        : placeholder;
    } else {
      const selectedOpt =
        options.find((o) => o.value === value) ||
        options.find(
          (o) =>
            typeof value === "string" &&
            o.value.toLowerCase() === value.trim().toLowerCase(),
        );
      if (selectedOpt) {
        if (renderTriggerLabel) return renderTriggerLabel(selectedOpt);
        return (
          <span className="flex items-center gap-2">
            {selectedOpt.icon && <span className="flex-shrink-0 text-muted-foreground">{selectedOpt.icon}</span>}
            <span className="truncate">{selectedOpt.label}</span>
          </span>
        );
      }
      if (typeof value === "string" && value.trim()) {
        return <span className="truncate">{value}</span>;
      }
      return placeholder;
    }
  };

  const isDense = Boolean(className?.includes("h-6") || className?.includes("h-7"));

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex w-full min-w-0 cursor-pointer items-center justify-between border border-border bg-white text-left shadow-sm",
            "transition-colors select-none text-left focus:outline-none",
            isDense ? "px-1.5 py-0" : "px-3 py-2",
            !className?.includes("h-") && "h-9",
            !className?.includes("text-") && "text-xs",
            !className?.includes("rounded-") && "rounded-lg",
            open && !error ? "border-brand-500 ring-2 ring-brand-200" : "",
            error
              ? "border-red-400 ring-1 ring-red-200"
              : !open
                ? "hover:bg-muted/20 hover:border-brand-300"
                : "",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "",
            className
          )}
        >
          <span className={cn("truncate flex-1 min-w-0", (multiple ? (Array.isArray(value) && value.length > 0) : value) ? "text-foreground" : "text-muted-foreground")}>
            {getSelectedLabel()}
          </span>
          <ChevronsUpDown className={cn("text-muted-foreground flex-shrink-0", isDense ? "w-3 h-3 ml-0.5" : "w-4 h-4 ml-2")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "rounded-xl border border-border bg-white p-0 shadow-lg",
          popoverClassName ?? "w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)]",
        )}
        align="start"
        sideOffset={4}
      >
        {/* Search Input */}
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-[9px] h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="h-8 w-full rounded-lg border border-border bg-muted/10 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-[7px] rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Options List */}
        <div
          className="max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain p-1.5"
          onWheelCapture={handleScrollableWheel}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-4 gap-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                {q ? `No results for "${q}"` : "No options available"}
              </p>
            </div>
          ) : (
            <>
              {multiple && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const allSelected = Array.isArray(value) && value.length === options.length;
                      onChange(allSelected ? [] : options.map((o) => o.value));
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-muted/60 rounded-md"
                  >
                    <Checkbox
                      checked={Array.isArray(value) && value.length === options.length}
                      className="w-3.5 h-3.5"
                    />
                    Select All
                  </button>
                  <div className="border-t border-border my-1" />
                </>
              )}
              {filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
                    "hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40",
                    isSelected(opt.value) && "bg-brand-50"
                  )}
                >
                  {multiple && (
                    <Checkbox
                      checked={isSelected(opt.value)}
                      className="w-3.5 h-3.5 flex-shrink-0"
                    />
                  )}
                  {opt.icon && (
                    <span className="flex-shrink-0 text-muted-foreground">
                      {opt.icon}
                    </span>
                  )}
                  <span className="flex-1 text-foreground min-w-0">
                    <span className="block truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="block text-[10px] text-muted-foreground truncate mt-0.5">
                        {opt.sublabel}
                      </span>
                    )}
                  </span>
                  {opt.trailing && (
                    <span className="flex-shrink-0">{opt.trailing}</span>
                  )}
                  {!multiple && isSelected(opt.value) && (
                    <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}
        </div>

        {multiple && (
          <div className="flex items-center justify-between border-t border-border px-2.5 py-2">
            <span className="text-[10px] text-muted-foreground">
              {Array.isArray(value) ? value.length : 0} of {options.length} selected
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
            >
              Done
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
