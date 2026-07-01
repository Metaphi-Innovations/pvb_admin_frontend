"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  groupLedgerParentOptionsByHead,
  parentGroupLabel,
  searchLedgerParentOptions,
  type LedgerParentOption,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { buildVoucherLedgerParentOptions } from "@/lib/accounts/voucher-quick-add-ledger";

interface VoucherLedgerGroupSelectProps {
  records: ChartOfAccount[];
  value: number | null;
  onChange: (parentGroupId: number) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function VoucherLedgerGroupSelect({
  records,
  value,
  onChange,
  disabled,
  placeholder = "Select ledger group…",
}: VoucherLedgerGroupSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = useMemo(
    () => buildVoucherLedgerParentOptions(records),
    [records],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    return searchLedgerParentOptions(options, search, 500);
  }, [options, search]);

  const sections = useMemo(
    () => groupLedgerParentOptionsByHead(filtered),
    [filtered],
  );

  const selectedDisplay = value ? parentGroupLabel(records, value) : null;

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
        className="w-[min(400px,var(--radix-popover-trigger-width))] p-0 z-[400]"
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-2 border-b border-border/60">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              placeholder="Search ledger group…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>
        <div className="max-h-[min(320px,50vh)] overflow-y-auto py-1">
          {sections.length === 0 ? (
            <p className="px-3 py-6 text-xs text-center text-muted-foreground">
              No ledger groups found.
            </p>
          ) : (
            sections.map((section) => (
              <div key={section.headName} className="py-1">
                <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-navy-700">
                  {section.headName}
                </p>
                {section.groups.map((group) => (
                  <div key={`${section.headName}-${group.groupName}`}>
                    <p className="px-3 py-1 text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                      <span className="text-muted-foreground/50">├─</span>
                      {group.groupName}
                    </p>
                    {group.items.map((opt) => (
                      <ParentRow
                        key={opt.id}
                        opt={opt}
                        selected={value === opt.id}
                        onSelect={handleSelect}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ParentRow({
  opt,
  selected,
  onSelect,
}: {
  opt: LedgerParentOption;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(opt.id)}
      className={cn(
        "w-full flex items-center gap-2 pl-7 pr-3 py-2 text-left transition-colors outline-none",
        "hover:bg-brand-50/60 focus-visible:bg-brand-50/60",
        selected && "bg-brand-50/80",
      )}
    >
      <span className="text-muted-foreground/50 text-[11px] shrink-0">├─</span>
      <span className="flex-1 min-w-0 text-xs text-foreground truncate">
        {opt.node.accountName}
      </span>
      {selected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
    </button>
  );
}
