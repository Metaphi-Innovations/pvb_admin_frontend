"use client";

import React, { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import {
  buildLedgerParentOptions,
  parentGroupLabel,
  searchLedgerParentOptions,
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

interface CoaParentGroupSelectorProps {
  records: ChartOfAccount[];
  value: number | null;
  onChange: (parentGroupId: number) => void;
  disabled?: boolean;
  parentFilter?: (node: ChartOfAccount) => boolean;
}

export function CoaParentGroupSelector({
  records,
  value,
  onChange,
  disabled,
  parentFilter,
}: CoaParentGroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = useMemo(() => {
    const base = buildLedgerParentOptions(records);
    if (!parentFilter) return base;
    return base.filter((o) => parentFilter(o.node));
  }, [records, parentFilter]);
  const filtered = useMemo(
    () => searchLedgerParentOptions(options, search),
    [options, search],
  );
  const selected = useMemo(
    () => (value ? options.find((o) => o.id === value) : undefined),
    [options, value],
  );

  const inputValue = open ? search : selected?.node.accountName ?? "";

  const handleOpenChange = (next: boolean) => {
    if (disabled) return;
    setOpen(next);
    if (!next) setSearch("");
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
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-muted-foreground">
                No account groups match &ldquo;{search}&rdquo;
              </p>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors outline-none",
                    "hover:bg-orange-50/60 focus-visible:bg-orange-50/60",
                    value === opt.id && "bg-orange-50/80",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <PathResult path={opt.path} />
                  </div>
                  {value === opt.id && (
                    <Check className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))
            )}
          </div>
          {search.trim() && filtered.length >= 50 && (
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/40">
              Showing first 50 matches. Refine your search for more.
            </p>
          )}
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
