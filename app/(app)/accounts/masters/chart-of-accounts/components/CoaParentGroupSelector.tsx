"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import {
  buildLedgerParentOptions,
  parentGroupLabel,
  searchLedgerParentOptions,
  type LedgerParentOption,
} from "../chart-of-accounts-data";

function PathResult({ path }: { path: ChartOfAccount[] }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      {path.map((seg, i) => (
        <span
          key={seg.id}
          className={cn(
            "text-[11px] leading-snug truncate",
            i === 0 && "font-medium text-foreground",
            i > 0 && i < path.length - 1 && "text-muted-foreground",
            i === path.length - 1 && "font-medium text-foreground",
          )}
        >
          {i > 0 && <span className="text-muted-foreground/50 mr-1">›</span>}
          {seg.accountName}
        </span>
      ))}
    </div>
  );
}

function ParentOptionList({
  filtered,
  search,
  value,
  onSelect,
}: {
  filtered: LedgerParentOption[];
  search: string;
  value: number | null;
  onSelect: (id: number) => void;
}) {
  if (filtered.length === 0) {
    return (
      <p className="px-3 py-4 text-xs text-center text-muted-foreground">
        {search.trim()
          ? `No account groups match "${search}"`
          : "No account groups available"}
      </p>
    );
  }

  return (
    <>
      {filtered.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={cn(
            "w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors outline-none",
            "hover:bg-brand-50/60 focus-visible:bg-brand-50/60",
            value === opt.id && "bg-brand-50/80",
          )}
        >
          <div className="flex-1 min-w-0">
            <PathResult path={opt.path} />
          </div>
          {value === opt.id && (
            <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 mt-0.5" />
          )}
        </button>
      ))}
      {search.trim() && filtered.length >= 50 && (
        <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/40">
          Showing first 50 matches. Refine your search for more.
        </p>
      )}
    </>
  );
}

interface CoaParentGroupSelectorProps {
  records: ChartOfAccount[];
  value: number | null;
  onChange: (parentGroupId: number) => void;
  disabled?: boolean;
  parentFilter?: (node: ChartOfAccount) => boolean;
  /** inline = always-visible list; popover = search input trigger; dropdown = compact select trigger */
  variant?: "popover" | "inline" | "dropdown";
  buildOptions?: (records: ChartOfAccount[]) => LedgerParentOption[];
  placeholder?: string;
}

export function CoaParentGroupSelector({
  records,
  value,
  onChange,
  disabled,
  parentFilter,
  variant = "popover",
  buildOptions = buildLedgerParentOptions,
  placeholder = "Select ledger group…",
}: CoaParentGroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const base = buildOptions(records);
    if (!parentFilter) return base;
    return base.filter((o) => parentFilter(o.node));
  }, [records, parentFilter, buildOptions]);

  const filtered = useMemo(
    () => searchLedgerParentOptions(options, search),
    [options, search],
  );
  const selected = useMemo(
    () => (value ? options.find((o) => o.id === value) : undefined),
    [options, value],
  );

  const inputValue = variant === "inline" || open ? search : selected?.node.accountName ?? "";

  const selectedDisplay = value
    ? parentGroupLabel(records, value)
    : null;

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (!next) setSearch("");
  };

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  if (disabled) {
    return (
      <div className="rounded-md border border-border/60 bg-muted/20 px-2.5 py-2">
        <p className="text-[10px] text-muted-foreground mb-0.5">Selected Parent</p>
        <p className="text-xs text-foreground leading-snug">
          {value ? parentGroupLabel(records, value) : "—"}
        </p>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <Input
            className="h-9 pl-8 text-xs focus-visible:ring-brand-300 focus-visible:ring-1"
            placeholder="Search account group..."
            value={inputValue}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="rounded-lg border border-border/60 bg-white max-h-[200px] overflow-y-auto py-1 shadow-sm">
          <ParentOptionList
            filtered={filtered}
            search={search}
            value={value}
            onSelect={handleSelect}
          />
        </div>
        {value != null && (
          <div className="rounded-md border border-border/50 bg-muted/20 px-2.5 py-2">
            <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Selected Parent</p>
            <p className="text-[11px] text-foreground leading-snug">
              {parentGroupLabel(records, value)}
            </p>
          </div>
        )}
      </div>
    );
  }

  if (variant === "dropdown") {
    return (
      <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            title={selectedDisplay ?? undefined}
            className={cn(
              "w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between gap-2",
              "hover:bg-muted/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "truncate text-xs",
                selectedDisplay ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {selectedDisplay ?? placeholder}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-2 border-b border-border/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search ledger group…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-brand-300"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[240px] overflow-y-auto py-1">
            <ParentOptionList
              filtered={filtered}
              search={search}
              value={value}
              onSelect={handleSelect}
            />
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
          <PopoverAnchor asChild>
            <Input
              className="h-8 pl-8 text-xs focus-visible:ring-orange-200/60 focus-visible:ring-1"
              placeholder="Search account group..."
              value={inputValue}
              disabled={disabled}
              onFocus={() => handleOpenChange(true)}
              onChange={(e) => {
                setSearch(e.target.value);
                setOpen(true);
              }}
            />
          </PopoverAnchor>
        </div>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[280px] overflow-y-auto py-1">
            <ParentOptionList
              filtered={filtered}
              search={search}
              value={value}
              onSelect={handleSelect}
            />
          </div>
        </PopoverContent>
      </Popover>

      {value != null && (
        <div className="rounded-md border border-border/50 bg-slate-50/60 px-2.5 py-2">
          <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Selected Parent</p>
          <p className="text-[11px] text-foreground leading-snug">
            {parentGroupLabel(records, value)}
          </p>
        </div>
      )}
    </div>
  );
}
