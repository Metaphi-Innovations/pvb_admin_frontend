"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  parentGroupLabel,
  type LedgerParentOption,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { CoaParentGroupTreeList } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaParentGroupTreeList";
import { buildVoucherLedgerParentOptions } from "@/lib/accounts/voucher-quick-add-ledger";

interface VoucherLedgerGroupSelectProps {
  records: ChartOfAccount[];
  value: number | null;
  onChange: (parentGroupId: number) => void;
  disabled?: boolean;
  placeholder?: string;
  buildOptions?: (records: ChartOfAccount[]) => LedgerParentOption[];
  error?: string | null;
}

const LIST_MAX_HEIGHT = 360;

export function VoucherLedgerGroupSelect({
  records,
  value,
  onChange,
  disabled,
  placeholder = "Select ledger group…",
  buildOptions = buildVoucherLedgerParentOptions,
  error,
}: VoucherLedgerGroupSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const selectableIds = useMemo(
    () => new Set(buildOptions(records).map((o) => o.id)),
    [records, buildOptions],
  );

  const selectedDisplay = value ? parentGroupLabel(records, value) : null;

  useEffect(() => {
    if (!open || value == null || !listRef.current) return;
    const selected = listRef.current.querySelector(
      '[data-parent-option-selected="true"]',
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [open, value, search]);

  const handleSelect = (id: number) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const list = listRef.current;
    if (!list) return;
    if (event.key === "PageDown") {
      event.preventDefault();
      list.scrollTop += list.clientHeight;
    } else if (event.key === "PageUp") {
      event.preventDefault();
      list.scrollTop -= list.clientHeight;
    }
  };

  return (
    <div className="space-y-1">
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
              error && "border-red-400 focus-visible:ring-red-300",
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
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[min(400px,var(--radix-popover-trigger-width))] p-0 z-[400] overflow-hidden"
          align="start"
          side="bottom"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-20 flex-shrink-0 p-2 border-b border-border bg-white shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search ledger group…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          </div>
          <div
            ref={listRef}
            tabIndex={-1}
            className="overflow-y-auto overscroll-contain scroll-smooth"
            style={{ maxHeight: LIST_MAX_HEIGHT }}
            onKeyDown={handleListKeyDown}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <CoaParentGroupTreeList
              records={records}
              selectedId={value}
              selectableIds={selectableIds}
              search={search}
              onSelect={handleSelect}
            />
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
