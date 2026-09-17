"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/lib/accounts/accounts-typography";
import type { GeneralLedgerPickerOption } from "./general-ledger-api-view";

function filterLedgers(ledgers: GeneralLedgerPickerOption[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return ledgers;
  return ledgers.filter((ledger) =>
    [ledger.code, ledger.name, ledger.ledgerType, ledger.parentGroup].some((value) =>
      value.toLowerCase().includes(q),
    ),
  );
}

export function GeneralLedgerSelect({
  value,
  ledgers,
  onChange,
  className,
  loading,
}: {
  value: string;
  ledgers: GeneralLedgerPickerOption[];
  onChange: (ledgerId: string) => void;
  className?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => ledgers.find((ledger) => ledger.id === value) ?? null,
    [ledgers, value],
  );

  const filtered = useMemo(() => filterLedgers(ledgers, query), [ledgers, query]);

  const selectedLabel = selected
    ? `${selected.code} — ${selected.name}`
    : value
      ? "Selected ledger"
      : null;

  return (
    <div className={cn("space-y-1 min-w-[260px]", className)}>
      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Ledger</Label>
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
              ACCOUNTS_FILTER_CONTROL_CLASS,
              "mt-0 w-full min-w-[260px] text-left flex items-center justify-between gap-2 hover:bg-muted/30 transition-colors",
            )}
          >
            <span
              className={cn(
                "truncate text-sm",
                selectedLabel ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              {loading && !selectedLabel
                ? "Loading ledgers…"
                : selectedLabel ?? "Search ledger by code or name…"}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0"
          align="start"
        >
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search ledger code or name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 text-sm pl-8"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[280px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                No ledgers match your search.
              </p>
            ) : (
              filtered.map((ledger) => {
                const isSelected = ledger.id === value;
                return (
                  <button
                    key={ledger.id}
                    type="button"
                    onClick={() => {
                      onChange(ledger.id);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={cn(
                      "w-full flex items-start gap-2 px-3 py-2 text-left rounded-lg transition-colors hover:bg-muted/60",
                      isSelected && "bg-brand-50",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        <span className="font-mono text-brand-700">{ledger.code}</span>
                        <span className="font-normal text-muted-foreground"> — {ledger.name}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {ledger.ledgerType}
                        {ledger.parentGroup ? ` · ${ledger.parentGroup}` : ""}
                      </p>
                    </div>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
