"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  formatMultiSelectLabel,
  type ReportMultiSelectOption,
} from "@/lib/accounts/report-multi-filter-utils";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/lib/accounts/accounts-typography";

export function ReportMultiSelect({
  label,
  values,
  onChange,
  options,
  placeholder,
  entityName,
  allLabel,
  className,
  minWidthClass = "min-w-[140px]",
  disabled,
  loading,
  grouped = false,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: ReportMultiSelectOption[];
  placeholder?: string;
  entityName: string;
  allLabel?: string;
  className?: string;
  minWidthClass?: string;
  disabled?: boolean;
  loading?: boolean;
  grouped?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const displayLabel = formatMultiSelectLabel(
    values,
    options,
    entityName,
    allLabel ?? placeholder ?? `All ${entityName}s`,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.searchText ?? ""} ${o.value}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, search]);

  const groupedOptions = useMemo(() => {
    if (!grouped) return null;
    const map = new Map<string, ReportMultiSelectOption[]>();
    for (const opt of filtered) {
      const g = opt.group ?? "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(opt);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, grouped]);

  const toggle = useCallback(
    (value: string) => {
      onChange(
        values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
      );
    },
    [onChange, values],
  );

  const selectAll = useCallback(() => {
    onChange(filtered.map((o) => o.value));
  }, [filtered, onChange]);

  const clearAll = useCallback(() => {
    onChange([]);
    setSearch("");
  }, [onChange]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => values.includes(o.value));

  return (
    <div className={cn("space-y-0.5", minWidthClass, className)}>
      <span className={ACCOUNTS_FILTER_LABEL_CLASS}>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || loading}
            className={cn(
              ACCOUNTS_FILTER_CONTROL_CLASS,
              "mt-0 w-full px-2.5 text-left inline-flex items-center justify-between gap-1.5",
              "border border-border rounded-lg bg-background hover:bg-muted/30 transition-colors",
              "disabled:opacity-50 disabled:pointer-events-none",
            )}
          >
            <span className={cn("truncate text-xs", values.length === 0 && "text-muted-foreground")}>
              {loading ? "Loading…" : displayLabel}
            </span>
            <span className="flex items-center gap-0.5 flex-shrink-0">
              {values.length > 0 && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAll();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      e.stopPropagation();
                      clearAll();
                    }
                  }}
                  aria-label={`Clear ${label}`}
                >
                  <X className="w-3 h-3" />
                </span>
              )}
              <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[220px] p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/20">
            <button
              type="button"
              onClick={allFilteredSelected ? clearAll : selectAll}
              className="text-[11px] font-medium text-brand-600 hover:underline"
            >
              {allFilteredSelected ? "Clear All" : "Select All"}
            </button>
            {values.length > 0 && (
              <span className="text-[10px] text-muted-foreground">{values.length} selected</span>
            )}
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">No options found</p>
            ) : grouped && groupedOptions ? (
              groupedOptions.map(([group, items]) => (
                <div key={group}>
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {group}
                  </p>
                  {items.map((opt) => (
                    <OptionRow
                      key={opt.value}
                      option={opt}
                      selected={values.includes(opt.value)}
                      onToggle={() => toggle(opt.value)}
                    />
                  ))}
                </div>
              ))
            ) : (
              filtered.map((opt) => (
                <OptionRow
                  key={opt.value}
                  option={opt}
                  selected={values.includes(opt.value)}
                  onToggle={() => toggle(opt.value)}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function OptionRow({
  option,
  selected,
  onToggle,
}: {
  option: ReportMultiSelectOption;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left rounded-sm transition-colors",
        selected ? "bg-brand-50 text-brand-800" : "hover:bg-muted/60 text-foreground",
      )}
    >
      <span
        className={cn(
          "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
          selected ? "bg-brand-600 border-brand-600" : "border-border bg-background",
        )}
      >
        {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </span>
      <span className="truncate flex-1">{option.label}</span>
    </button>
  );
}
