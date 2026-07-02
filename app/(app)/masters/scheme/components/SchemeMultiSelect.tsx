"use client";

import { Check, ChevronDown } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SchemeSelectOption {
  id: string;
  name: string;
  helper?: string;
}

interface SchemeMultiSelectProps {
  label: string;
  placeholder?: string;
  options: SchemeSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  className?: string;
  maxSelection?: number;
}

export function SchemeMultiSelect({
  label,
  placeholder = "Select...",
  options,
  selectedIds,
  onChange,
  error,
  className,
  maxSelection,
}: SchemeMultiSelectProps) {
  const selected = options.filter((o) => selectedIds.includes(o.id));
  const allSelected = options.length > 0 && selectedIds.length === options.length;
  const summary =
    selected.length === 0
      ? placeholder
      : allSelected
        ? `All (${options.length})`
        : selected.length === 1
          ? selected[0].name
          : `${selected.length} selected`;

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (maxSelection === 1) {
      onChange([id]);
      return;
    }
    if (maxSelection && selectedIds.length >= maxSelection) return;
    onChange([...selectedIds, id]);
  };

  const selectAll = () => {
    if (maxSelection === 1 || options.length === 0) return;
    const ids = maxSelection
      ? options.slice(0, maxSelection).map((o) => o.id)
      : options.map((o) => o.id);
    onChange(ids);
  };

  const showSelectAll = maxSelection !== 1 && options.length > 0;

  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 w-full items-center justify-between rounded-md border border-border bg-white px-2.5 text-xs text-left",
              "hover:bg-muted/20 focus:outline-none focus:ring-1 focus:ring-brand-500",
              error && "border-red-400",
            )}
          >
            <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
              {summary}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0">
          <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{selected.length} selected</span>
              {showSelectAll && !allSelected && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Select All
                </button>
              )}
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                Clear
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto p-1">
            {showSelectAll && (
              <>
                <button
                  type="button"
                  onClick={() => (allSelected ? onChange([]) : selectAll())}
                  className="flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      allSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-border bg-white",
                    )}
                  >
                    {allSelected && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="text-xs font-semibold text-brand-700">
                    Select All ({options.length})
                  </span>
                </button>
                <div className="my-1 border-t border-border" />
              </>
            )}
            {options.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => toggle(option.id)}
                  className="flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      checked ? "border-brand-600 bg-brand-600 text-white" : "border-border bg-white",
                    )}
                  >
                    {checked && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{option.name}</span>
                    {option.helper && (
                      <span className="block text-[10px] text-muted-foreground">{option.helper}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
