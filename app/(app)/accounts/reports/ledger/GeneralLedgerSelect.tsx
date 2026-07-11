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
import {
  filterGeneralLedgerLedgers,
  formatGeneralLedgerTypeLabel,
  type GeneralLedgerLedgerOption,
} from "./general-ledger-data";

export function GeneralLedgerSelect({
  value,
  ledgers,
  onChange,
  className,
}: {
  value: string;
  ledgers: GeneralLedgerLedgerOption[];
  onChange: (ledgerId: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(
    () => ledgers.find((ledger) => ledger.id === value) ?? null,
    [ledgers, value],
  );

  const filtered = useMemo(
    () => filterGeneralLedgerLedgers(ledgers, query),
    [ledgers, query],
  );

  const selectedLabel = selected
    ? `${selected.name} — ${formatGeneralLedgerTypeLabel(selected.ledgerType)}`
    : null;

  return (
    <div className={cn("space-y-1 min-w-[260px]", className)}>
      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>
        Ledger <span className="text-red-500">*</span>
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
              {selectedLabel ?? "Search ledger by name…"}
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
                placeholder="Search ledger name, group, type…"
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
                const typeLabel = formatGeneralLedgerTypeLabel(ledger.ledgerType);
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
                        {ledger.name}
                        <span className="font-normal text-muted-foreground"> — {typeLabel}</span>
                      </p>
                      {ledger.parentGroup && ledger.parentGroup !== "—" ? (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {ledger.parentGroup}
                        </p>
                      ) : null}
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
