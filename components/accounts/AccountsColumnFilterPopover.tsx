"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilterType,
  DateFilterPreset,
  NumberFilterOperator,
} from "@/lib/accounts/column-filter-types";
import { isColumnFilterActive } from "@/lib/accounts/column-filter-engine";

const NUM_OPS: { id: NumberFilterOperator; label: string }[] = [
  { id: "equals", label: "Equals" },
  { id: "gt", label: "Greater Than" },
  { id: "lt", label: "Less Than" },
  { id: "between", label: "Between" },
  { id: "top10", label: "Top 10" },
  { id: "blank", label: "Blank" },
  { id: "notBlank", label: "Not Blank" },
];

const DATE_PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "thisWeek", label: "This Week" },
  { id: "lastWeek", label: "Last Week" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
  { id: "between", label: "Between" },
  { id: "before", label: "Before" },
  { id: "after", label: "After" },
  { id: "custom", label: "Custom Range" },
];

function defaultFilter(type: AccountsColumnFilterType): AccountsColumnFilterState {
  return { type, numberOperator: "equals", datePreset: "thisMonth" };
}

export function AccountsColumnFilterPopover({
  label,
  filterType,
  value,
  onChange,
  uniqueValues = [],
  statusOptions = [],
}: {
  label: string;
  filterType: AccountsColumnFilterType;
  value?: AccountsColumnFilterState;
  onChange: (value: AccountsColumnFilterState | undefined) => void;
  uniqueValues?: string[];
  statusOptions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AccountsColumnFilterState>(() => value ?? defaultFilter(filterType));
  const [valueSearch, setValueSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(value ?? defaultFilter(filterType));
      setValueSearch("");
    }
  }, [open, value, filterType]);

  const active = isColumnFilterActive(value);

  const checkboxOptions = useMemo(() => {
    const base = filterType === "status" ? statusOptions : uniqueValues;
    const q = valueSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((v) => v.toLowerCase().includes(q));
  }, [filterType, statusOptions, uniqueValues, valueSearch]);

  const apply = () => {
    const next =
      filterType === "text" || filterType === "status"
        ? { ...draft, textValue: undefined, textOperator: undefined }
        : draft;
    onChange(isColumnFilterActive(next) ? next : undefined);
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setDraft(defaultFilter(filterType));
    setOpen(false);
  };

  const toggleValue = (val: string) => {
    setDraft((d) => {
      const cur = d.selectedValues ?? [];
      const next = cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val];
      return { ...d, selectedValues: next };
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Filter ${label}`}
          className={cn(
            "accounts-col-filter-btn",
            active && "is-active",
          )}
        >
          <Filter className="w-3 h-3" strokeWidth={2.25} />
          {active ? <span className="accounts-col-filter-dot" aria-hidden /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="accounts-col-filter-popover w-[240px] p-0 z-[120]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2.5 py-2 border-b border-border/70">
          <p className="text-[11px] font-semibold text-foreground truncate">Filter: {label}</p>
        </div>

        <div className="max-h-[280px] overflow-y-auto overscroll-contain px-2.5 py-2 space-y-2">
          {(filterType === "text" || filterType === "status") && (
            <>
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  value={valueSearch}
                  onChange={(e) => setValueSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div className="space-y-0.5 max-h-[180px] overflow-y-auto">
                {checkboxOptions.map((val) => (
                  <label
                    key={val}
                    className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/40 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 rounded accent-brand-600"
                      checked={(draft.selectedValues ?? []).includes(val)}
                      onChange={() => toggleValue(val)}
                    />
                    <span className="text-[11px] text-foreground truncate">{val}</span>
                  </label>
                ))}
                {checkboxOptions.length === 0 && (
                  <p className="text-[11px] text-muted-foreground py-2 text-center">No matching values</p>
                )}
              </div>
            </>
          )}

          {(filterType === "number" || filterType === "amount") && (
            <>
              <select
                value={draft.numberOperator ?? "equals"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, numberOperator: e.target.value as NumberFilterOperator }))
                }
                className="w-full h-8 text-xs rounded-md border border-border bg-white px-2"
              >
                {NUM_OPS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {draft.numberOperator !== "blank" &&
                draft.numberOperator !== "notBlank" &&
                draft.numberOperator !== "top10" && (
                  <Input
                    type="number"
                    value={draft.numberValue ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        numberValue: e.target.value === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    placeholder={filterType === "amount" ? "Amount" : "Value"}
                    className="h-8 text-xs"
                  />
                )}
              {draft.numberOperator === "between" && (
                <Input
                  type="number"
                  value={draft.numberValue2 ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      numberValue2: e.target.value === "" ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder="To"
                  className="h-8 text-xs"
                />
              )}
            </>
          )}

          {filterType === "date" && (
            <>
              <select
                value={draft.datePreset ?? "thisMonth"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, datePreset: e.target.value as DateFilterPreset }))
                }
                className="w-full h-8 text-xs rounded-md border border-border bg-white px-2"
              >
                {DATE_PRESETS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {(draft.datePreset === "between" ||
                draft.datePreset === "custom" ||
                draft.datePreset === "before" ||
                draft.datePreset === "after") && (
                <Input
                  type="date"
                  value={draft.dateFrom ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
              {(draft.datePreset === "between" || draft.datePreset === "custom") && (
                <Input
                  type="date"
                  value={draft.dateTo ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                  className="h-8 text-xs"
                />
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-1.5 px-2.5 py-2 border-t border-border/70 bg-muted/10">
          <Button variant="ghost" size="sm" className="h-7 text-[11px] px-2" onClick={clear}>
            Clear
          </Button>
          <Button size="sm" className="h-7 text-[11px] px-2.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
