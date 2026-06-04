"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, X, Search } from "lucide-react";

// Option item configuration interface
export interface AutocompleteOption {
  value: string;
  label: string;
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
  renderTriggerLabel,
}: AutocompleteSelectProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(q.toLowerCase())
  );

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
      const selectedOpt = options.find((o) => o.value === value);
      if (selectedOpt) {
        if (renderTriggerLabel) return renderTriggerLabel(selectedOpt);
        return (
          <span className="flex items-center gap-2">
            {selectedOpt.icon && <span className="flex-shrink-0 text-muted-foreground">{selectedOpt.icon}</span>}
            <span className="truncate">{selectedOpt.label}</span>
          </span>
        );
      }
      return placeholder;
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { if (!disabled) setOpen(o); if (!o) setQ(""); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 border bg-white cursor-pointer",
            "transition-colors select-none text-left focus:outline-none",
            !className?.includes("h-") && "h-9",
            !className?.includes("text-") && "text-sm",
            !className?.includes("rounded-") && "rounded-input",
            open && !error ? "border-brand-400 ring-1 ring-brand-400" : "",
            error ? "border-red-400 ring-1 ring-red-200" : !open ? "border-border hover:border-brand-300" : "",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "",
            className
          )}
        >
          <span className={cn("truncate flex-1", (multiple ? (Array.isArray(value) && value.length > 0) : value) ? "text-foreground" : "text-muted-foreground")}>
            {getSelectedLabel()}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] rounded-lg shadow-lg border border-border bg-white"
        align="start"
        sideOffset={4}
      >
        {/* Search Input */}
        <div className="p-1.5 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[5px] text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="w-full pl-8 pr-3 py-1 text-xs focus:outline-none bg-transparent"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                className="absolute right-2 top-[5px]"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Options List */}
        <div className="max-h-40 overflow-y-auto p-1">
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
                    "w-full flex items-center gap-2 px-2 py-1 text-xs text-left rounded-md transition-colors",
                    "hover:bg-muted/60 disabled:opacity-40 disabled:cursor-not-allowed",
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
                  <span className="flex-1 text-foreground truncate">
                    {opt.label}
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
          <div className="border-t border-border p-1.5 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              {Array.isArray(value) ? value.length : 0} of {options.length} selected
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Done
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
