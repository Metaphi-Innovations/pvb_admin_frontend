"use client";

/**
 * Excel-style column filter — search + checkbox list only.
 * Used across all Accounts reports via AccountsColumnHeader / SortTh.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AccountsColumnFilterState,
  AccountsColumnFilterType,
  ColumnValueOption,
} from "@/lib/accounts/column-filter-types";
import { isColumnFilterActive } from "@/lib/accounts/column-filter-engine";
import { formatMoney } from "@/lib/accounts/money-format";

const BOOLEAN_OPTIONS: ColumnValueOption[] = [
  { value: "yes", count: 0 },
  { value: "no", count: 0 },
];

function formatOptionLabel(
  value: string,
  filterType: AccountsColumnFilterType,
  optionLabels: Record<string, string>,
): string {
  if (optionLabels[value]) return optionLabels[value];
  if (filterType === "amount" || filterType === "number") {
    const n = Number(String(value).replace(/[₹,\s]/g, ""));
    if (Number.isFinite(n)) return formatMoney(n);
  }
  return value;
}

function ValueCheckboxRow({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
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
      <span className="text-[11px] text-foreground truncate flex-1 min-w-0">{label}</span>
      {count != null && count > 0 && (
        <span className="text-[10px] tabular-nums text-muted-foreground flex-shrink-0">
          ({count})
        </span>
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
  valueOptions?: ColumnValueOption[];
  /** @deprecated Use valueOptions */
  uniqueValues?: string[];
  statusOptions?: string[];
  optionLabels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const listOptions = useMemo((): ColumnValueOption[] => {
    if (filterType === "boolean") return BOOLEAN_OPTIONS;
    if (valueOptions.length > 0) return valueOptions;
    if (filterType === "status" || filterType === "select") {
      return statusOptions.map((v) => ({ value: v, count: 0 }));
    }
    return [];
  }, [valueOptions, filterType, statusOptions]);

  useEffect(() => {
    if (!open) return;
    const existing = value?.selectedValues;
    if (existing && existing.length > 0) {
      setSelected([...existing]);
    } else {
      // Excel default: all values selected when no filter is active
      setSelected(listOptions.map((o) => o.value));
    }
    setSearch("");
  }, [open, value, listOptions]);

  const active = isColumnFilterActive(value);

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return listOptions;
    return listOptions.filter((o) => {
      const display = formatOptionLabel(o.value, filterType, optionLabels);
      return display.toLowerCase().includes(q) || o.value.toLowerCase().includes(q);
    });
  }, [listOptions, search, optionLabels, filterType]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const allFilteredSelected =
    filteredOptions.length > 0 && filteredOptions.every((o) => selectedSet.has(o.value));

  const toggleValue = (val: string) => {
    setSelected((cur) => (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]));
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const remove = new Set(filteredOptions.map((o) => o.value));
      setSelected((cur) => cur.filter((v) => !remove.has(v)));
    } else {
      setSelected((cur) => {
        const next = new Set(cur);
        for (const o of filteredOptions) next.add(o.value);
        return [...next];
      });
    }
  };

  const apply = () => {
    // No values / nothing selectable → clear
    if (listOptions.length === 0 || selected.length === 0) {
      onChange(undefined);
      setOpen(false);
      return;
    }

    // All column values selected → same as no filter (Excel behavior)
    const allSelected =
      selected.length === listOptions.length &&
      listOptions.every((o) => selectedSet.has(o.value));

    if (allSelected) {
      onChange(undefined);
      setOpen(false);
      return;
    }

    const next: AccountsColumnFilterState = {
      type: filterType,
      selectedValues: selected,
    };
    onChange(next);
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setSelected(listOptions.map((o) => o.value));
    setSearch("");
    setOpen(false);
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
        className="accounts-col-filter-popover w-[240px] p-0 z-[120]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-[7px] text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              autoFocus
            />
          </div>
        </div>

        <div className="px-1.5 py-1.5 border-b border-border/60">
          <ValueCheckboxRow
            label="Select All"
            checked={allFilteredSelected && filteredOptions.length > 0}
            onToggle={toggleSelectAllFiltered}
          />
        </div>

        <div className="px-1.5 py-1.5 space-y-0.5 max-h-[220px] overflow-y-auto overscroll-contain">
          {filteredOptions.map((opt) => (
            <ValueCheckboxRow
              key={opt.value}
              label={formatOptionLabel(opt.value, filterType, optionLabels)}
              count={opt.count > 0 ? opt.count : undefined}
              checked={selectedSet.has(opt.value)}
              onToggle={() => toggleValue(opt.value)}
            />
          ))}
          {filteredOptions.length === 0 && (
            <p className="text-[11px] text-muted-foreground py-3 text-center">No matching values</p>
          )}
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
