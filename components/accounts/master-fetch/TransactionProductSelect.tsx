"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import type { TransactionProductOption } from "@/lib/accounts/transaction-master-fetch";
import { MasterFetchedBadge } from "./MasterFetchedBadge";

export function TransactionProductSelect({
  products,
  value,
  onSelect,
  disabled,
  placeholder = "Select product from master…",
}: {
  products: TransactionProductOption[];
  value: number | null;
  onSelect: (p: TransactionProductOption) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find((p) => p.id === value);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.hsn.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-0.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            className="w-full h-7 px-2 text-xs text-left border border-border rounded-md bg-background flex items-center justify-between disabled:opacity-50"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected ? `${selected.sku} — ${selected.name}` : placeholder}
            </span>
            <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search SKU, name, HSN…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>
            <MasterFetchedBadge />
          </div>
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No products in Product Master
              </p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "w-full flex flex-col gap-0.5 px-2 py-1.5 text-xs text-left hover:bg-muted/60",
                    value === p.id && "bg-brand-50",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-brand-700 shrink-0">{p.sku}</span>
                    <span className="flex-1 truncate font-medium">{p.name}</span>
                    {value === p.id && <Check className="w-3 h-3 text-brand-600" />}
                  </span>
                  <span className="text-[10px] text-muted-foreground pl-0.5">
                    HSN {p.hsn || "—"} · GST {p.taxPct}% · {p.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
