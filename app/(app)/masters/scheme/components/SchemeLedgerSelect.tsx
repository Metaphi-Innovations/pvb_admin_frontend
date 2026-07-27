"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getPostableCoaAccounts } from "@/app/(app)/accounts/data";
import { schemeCompactFieldClass } from "./scheme-form-inputs";

export type SchemeLedgerSelection = {
  id: number | null;
  name: string;
};

interface SchemeLedgerSelectProps {
  label: string;
  valueId: number | null;
  valueName: string;
  onChange: (next: SchemeLedgerSelection) => void;
  placeholder?: string;
  required?: boolean;
  dense?: boolean;
}

/**
 * Read-only Chart of Accounts ledger picker for Scheme Master accounting mapping.
 * Does not modify Accounts / COA — only reads postable ledgers.
 */
export function SchemeLedgerSelect({
  label,
  valueId,
  valueName,
  onChange,
  placeholder = "Select ledger…",
  required,
  dense = false,
}: SchemeLedgerSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(() => {
    try {
      return getPostableCoaAccounts()
        .filter((l) => l.status === "active")
        .map((l) => ({
          id: l.id,
          code: l.accountCode,
          name: l.accountName,
          label: `${l.accountCode} · ${l.accountName}`,
        }));
    } catch {
      return [];
    }
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 80);
    return options
      .filter(
        (o) =>
          o.name.toLowerCase().includes(q) ||
          o.code.toLowerCase().includes(q) ||
          o.label.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [options, query]);

  const display =
    valueName ||
    (valueId != null ? options.find((o) => o.id === valueId)?.label : "") ||
    "";

  return (
    <div className={cn("min-w-0", dense ? "space-y-0.5" : "space-y-1")}>
      <Label
        className={cn(
          "font-medium text-muted-foreground",
          dense ? "text-[10px]" : "text-[11px]",
        )}
      >
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              schemeCompactFieldClass,
              "scheme-ctrl flex w-full items-center justify-between rounded-md border border-border bg-white text-left",
              "hover:bg-muted/20 focus:outline-none focus:ring-1 focus:ring-brand-500",
              dense ? "h-7 px-2 text-[11px]" : "px-2.5",
            )}
          >
            <span className={cn("truncate", !display && "text-muted-foreground")}>
              {display || placeholder}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[18rem] p-0"
        >
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-[7px] h-3.5 w-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ledgers…"
                className="w-full bg-transparent py-1.5 pl-7 pr-2 text-xs focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {valueId != null || valueName ? (
              <button
                type="button"
                className="mb-0.5 w-full rounded-md px-2.5 py-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted/60"
                onClick={() => {
                  onChange({ id: null, name: "" });
                  setOpen(false);
                }}
              >
                Clear selection
              </button>
            ) : null}
            {filtered.length === 0 ? (
              <p className="px-2.5 py-3 text-[11px] text-muted-foreground">No ledgers found</p>
            ) : (
              filtered.map((o) => {
                const selected = valueId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange({ id: o.id, name: o.label });
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted/60",
                      selected && "bg-brand-50",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                    {selected ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />
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
