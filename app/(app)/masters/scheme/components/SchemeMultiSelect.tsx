"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
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
  searchPlaceholder?: string;
  options: SchemeSelectOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
  className?: string;
  maxSelection?: number;
  /** Compact ERP density (Scheme Master unified form). */
  dense?: boolean;
  required?: boolean;
}

function handleScrollableWheel(event: React.WheelEvent<HTMLElement>) {
  const current = event.currentTarget;
  if (current.scrollHeight <= current.clientHeight) return;

  const atTop = current.scrollTop <= 0;
  const atBottom =
    current.scrollTop + current.clientHeight >= current.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return;

  event.preventDefault();
  event.stopPropagation();
  current.scrollTop += event.deltaY;
}

export function SchemeMultiSelect({
  label,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  options,
  selectedIds,
  onChange,
  error,
  className,
  maxSelection,
  dense = false,
  required = false,
}: SchemeMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => options.filter((o) => selectedIds.includes(o.id)),
    [options, selectedIds],
  );
  const allSelected =
    options.length > 0 && selectedIds.length === options.length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.name} ${option.helper ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  const filteredIds = filtered.map((o) => o.id);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

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
      setOpen(false);
      setQuery("");
      return;
    }
    if (maxSelection && selectedIds.length >= maxSelection) return;
    onChange([...selectedIds, id]);
  };

  const selectAllFiltered = () => {
    if (maxSelection === 1 || filteredIds.length === 0) return;
    if (allFilteredSelected) {
      onChange(selectedIds.filter((id) => !filteredIds.includes(id)));
      return;
    }
    const merged = [...new Set([...selectedIds, ...filteredIds])];
    onChange(
      maxSelection ? merged.slice(0, maxSelection) : merged,
    );
  };

  const showSelectAll = maxSelection !== 1 && options.length > 0;

  return (
    <div className={cn(dense ? "space-y-0.5" : "space-y-1", className)}>
      <Label
        className={cn(
          dense ? "text-[10px] font-medium text-muted-foreground" : "text-xs font-medium",
        )}
      >
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-md border border-border bg-white text-left",
              "hover:bg-muted/20 focus:outline-none focus:ring-1 focus:ring-brand-500",
              dense
                ? "scheme-ctrl h-7 px-2 text-[11px]"
                : "h-8 px-2.5 text-xs",
              error && "border-red-400",
            )}
          >
            <span
              className={cn(
                "truncate",
                selected.length === 0 && "text-muted-foreground",
              )}
            >
              {summary}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
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
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-[7px] rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">
                {selected.length} selected
              </span>
              {showSelectAll && !allFilteredSelected && filteredIds.length > 0 ? (
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700"
                >
                  Select All
                </button>
              ) : null}
            </div>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div
            className="max-h-[200px] overflow-y-auto p-1"
            onWheelCapture={handleScrollableWheel}
          >
            {showSelectAll && filteredIds.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="flex w-full items-start gap-2 rounded px-1.5 py-1.5 text-left hover:bg-muted"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      allFilteredSelected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-border bg-white",
                    )}
                  >
                    {allFilteredSelected && <Check className="h-2.5 w-2.5" />}
                  </span>
                  <span className="text-xs font-semibold text-brand-700">
                    {query.trim()
                      ? `Select All Filtered (${filteredIds.length})`
                      : `Select All (${options.length})`}
                  </span>
                </button>
                <div className="my-1 border-t border-border" />
              </>
            ) : null}

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  {query.trim()
                    ? `No results for "${query.trim()}"`
                    : "No options available"}
                </p>
              </div>
            ) : (
              filtered.map((option) => {
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
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-border bg-white",
                      )}
                    >
                      {checked && <Check className="h-2.5 w-2.5" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium">{option.name}</span>
                      {option.helper ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {option.helper}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error ? <p className="text-[10px] text-red-500">{error}</p> : null}
    </div>
  );
}
