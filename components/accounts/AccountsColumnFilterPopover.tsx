"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AccountsDateInput } from "@/components/accounts/AccountsDateInput";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilterType,
  ColumnValueOption,
  DateFilterPreset,
} from "@/lib/accounts/column-filter-types";
import { isColumnFilterActive } from "@/lib/accounts/column-filter-engine";

const DATE_PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "thisMonth", label: "This Month" },
  { id: "thisFinancialYear", label: "Financial Year" },
  { id: "custom", label: "Custom Range" },
];

const BOOLEAN_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

function defaultFilter(type: AccountsColumnFilterType): AccountsColumnFilterState {
  return { type };
}

function usesValueList(type: AccountsColumnFilterType): boolean {
  return type === "text" || type === "status" || type === "select" || type === "number" || type === "amount";
}

function ValueCheckboxRow({
  value,
  label,
  count,
  checked,
  onToggle,
}: {
  value: string;
  label?: string;
  count?: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2 py-1 px-1.5 rounded-md text-left transition-colors",
        checked ? "bg-brand-50/80 hover:bg-brand-50" : "hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0",
          checked ? "bg-brand-600 border-brand-600" : "border-border bg-white",
        )}
      >
        {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
      </span>
      <span className="text-[11px] text-foreground truncate flex-1 min-w-0">{label ?? value}</span>
      {count != null && (
        <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0">({count})</span>
      )}
    </button>
  );
}

export function AccountsColumnFilterPopover({
  label,
  filterType,
  value,
  onChange,
  valueOptions = [],
  statusOptions = [],
  optionLabels = {},
}: {
  label: string;
  filterType: AccountsColumnFilterType;
  value?: AccountsColumnFilterState;
  onChange: (value: AccountsColumnFilterState | undefined) => void;
  /** Distinct values with counts — preferred over legacy uniqueValues. */
  valueOptions?: ColumnValueOption[];
  /** @deprecated Use valueOptions */
  uniqueValues?: string[];
  statusOptions?: string[];
  optionLabels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AccountsColumnFilterState>(() => value ?? defaultFilter(filterType));
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(value ?? defaultFilter(filterType));
      setSearch("");
    }
  }, [open, value, filterType]);

  const active = isColumnFilterActive(value);

  const listOptions = useMemo((): ColumnValueOption[] => {
    if (valueOptions.length > 0) return valueOptions;
    if (filterType === "status" || filterType === "select") {
      return statusOptions.map((v) => ({ value: v, count: 0 }));
    }
    return [];
  }, [valueOptions, filterType, statusOptions]);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listOptions;
    return listOptions.filter((o) => {
      const display = optionLabels[o.value] ?? o.value;
      return display.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
    });
  }, [listOptions, search, optionLabels]);

  const selectedSet = useMemo(() => new Set(draft.selectedValues ?? []), [draft.selectedValues]);

  const allFilteredSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => selectedSet.has(o.value));

  const toggleValue = (val: string) => {
    setDraft((d) => {
      const cur = d.selectedValues ?? [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...d, selectedValues: next, textValue: undefined };
    });
  };

  const selectAllFiltered = () => {
    setDraft((d) => {
      const cur = new Set(d.selectedValues ?? []);
      for (const o of filteredOptions) cur.add(o.value);
      return { ...d, selectedValues: [...cur], textValue: undefined };
    });
  };

  const clearAllSelected = () => {
    setDraft((d) => ({ ...d, selectedValues: [], textValue: undefined }));
    setSearch("");
  };

  const apply = () => {
    let next: AccountsColumnFilterState = { ...draft, type: filterType };

    if (filterType === "date") {
      if (!next.datePreset && !next.dateFrom && !next.dateTo) {
        onChange(undefined);
        setOpen(false);
        return;
      }
      if (next.datePreset && next.datePreset !== "custom" && next.datePreset !== "between") {
        next = { ...next, dateFrom: undefined, dateTo: undefined, selectedValues: undefined };
      } else if (next.datePreset === "custom" || next.datePreset === "between") {
        if (!next.dateFrom && !next.dateTo) {
          onChange(undefined);
          setOpen(false);
          return;
        }
        next = {
          ...next,
          dateFrom: next.dateFrom || undefined,
          dateTo: next.dateTo || next.dateFrom || undefined,
          selectedValues: undefined,
        };
      }
    } else if (filterType === "boolean") {
      if (!next.selectedValues?.length) {
        onChange(undefined);
        setOpen(false);
        return;
      }
    } else if (usesValueList(filterType)) {
      if (!next.selectedValues?.length) {
        onChange(undefined);
        setOpen(false);
        return;
      }
      next = { ...next, textValue: undefined, textOperator: undefined };
    }

    onChange(isColumnFilterActive(next) ? next : undefined);
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setDraft(defaultFilter(filterType));
    setSearch("");
    setOpen(false);
  };

  const setDatePreset = (preset: DateFilterPreset) => {
    setDraft((d) => ({
      ...d,
      datePreset: preset,
      selectedValues: undefined,
      ...(preset !== "custom" && preset !== "between" ? { dateFrom: undefined, dateTo: undefined } : {}),
    }));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Filter ${label}`}
          className={cn("accounts-col-filter-btn", active && "is-active")}
        >
          <Filter className="w-3 h-3" strokeWidth={2.25} />
          {active ? <span className="accounts-col-filter-dot" aria-hidden /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="accounts-col-filter-popover w-[260px] p-0 z-[120]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2.5 py-2 border-b border-border/70 bg-muted/10">
          <p className="text-[11px] font-semibold text-foreground truncate">Filter: {label}</p>
        </div>

        <div className="max-h-[320px] overflow-y-auto overscroll-contain">
          {filterType === "date" ? (
            <div className="px-2.5 py-2 space-y-2">
              <div className="space-y-0.5">
                {DATE_PRESETS.map((preset) => (
                  <label
                    key={preset.id}
                    className="flex items-center gap-2 py-1 px-1 rounded-md hover:bg-muted/40 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`date-preset-${label}`}
                      className="w-3.5 h-3.5 accent-brand-600"
                      checked={(draft.datePreset ?? "custom") === preset.id}
                      onChange={() => setDatePreset(preset.id)}
                    />
                    <span className="text-[11px] text-foreground">{preset.label}</span>
                  </label>
                ))}
              </div>
              {(draft.datePreset === "custom" || draft.datePreset === "between" || !draft.datePreset) && (
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      From
                    </span>
                    <AccountsDateInput
                      value={draft.dateFrom ?? ""}
                      onChange={(v) => setDraft((d) => ({ ...d, dateFrom: v, datePreset: "custom" }))}
                      aria-label={`${label} from date`}
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">To</span>
                    <AccountsDateInput
                      value={draft.dateTo ?? ""}
                      onChange={(v) => setDraft((d) => ({ ...d, dateTo: v, datePreset: "custom" }))}
                      aria-label={`${label} to date`}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : filterType === "boolean" ? (
            <div className="px-2.5 py-2 space-y-0.5">
              {BOOLEAN_OPTIONS.map((opt) => (
                <ValueCheckboxRow
                  key={opt.value}
                  value={opt.value}
                  label={opt.label}
                  checked={selectedSet.has(opt.value)}
                  onToggle={() => toggleValue(opt.value)}
                />
              ))}
            </div>
          ) : usesValueList(filterType) ? (
            <>
              <div className="p-2 border-b border-border/60">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-[7px] text-muted-foreground pointer-events-none" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}…`}
                    className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/60 bg-muted/15">
                <button
                  type="button"
                  onClick={allFilteredSelected ? clearAllSelected : selectAllFiltered}
                  className="text-[11px] font-medium text-brand-600 hover:underline"
                >
                  {allFilteredSelected ? "Clear All" : "Select All"}
                </button>
                {selectedSet.size > 0 && (
                  <span className="text-[10px] text-muted-foreground">{selectedSet.size} selected</span>
                )}
              </div>
              <div className="px-1.5 py-1.5 space-y-0.5 max-h-[200px] overflow-y-auto">
                {filteredOptions.map((opt) => (
                  <ValueCheckboxRow
                    key={opt.value}
                    value={opt.value}
                    label={optionLabels[opt.value] ?? opt.value}
                    count={opt.count > 0 ? opt.count : undefined}
                    checked={selectedSet.has(opt.value)}
                    onToggle={() => toggleValue(opt.value)}
                  />
                ))}
                {filteredOptions.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-3 text-center">No matching values</p>
                )}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-1.5 px-2.5 py-2 border-t border-border/70 bg-muted/10">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={clear}>
            Clear
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-2.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={apply}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
