"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CreditNoteLinkedInvoice } from "../credit-notes-data";

export interface LinkedInvoiceOption {
  id: number;
  invoiceNo: string;
  sub?: string;
}

export function LinkedInvoicesMultiSelect({
  label = "Linked Invoice(s) (Optional)",
  value,
  onChange,
  options,
  disabled,
}: {
  label?: string;
  value: CreditNoteLinkedInvoice[];
  onChange: (invoices: CreditNoteLinkedInvoice[]) => void;
  options: LinkedInvoiceOption[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedIds = useMemo(() => new Set(value.map((v) => v.id)), [value]);

  const filtered = useMemo(() => {
    if (!q.trim()) return options;
    const query = q.toLowerCase();
    return options.filter(
      (o) =>
        o.invoiceNo.toLowerCase().includes(query) ||
        (o.sub?.toLowerCase().includes(query) ?? false),
    );
  }, [options, q]);

  const toggle = (opt: LinkedInvoiceOption) => {
    if (selectedIds.has(opt.id)) {
      onChange(value.filter((v) => v.id !== opt.id));
      return;
    }
    onChange([...value, { id: opt.id, invoiceNo: opt.invoiceNo }]);
  };

  const remove = (id: number) => {
    onChange(value.filter((v) => v.id !== id));
  };

  return (
    <div className="space-y-1 md:col-span-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full min-h-9 px-3 py-1.5 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between gap-2",
              disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            )}
          >
            <div className="flex flex-wrap gap-1 flex-1 min-w-0">
              {value.length === 0 ? (
                <span className="text-muted-foreground text-xs">Select posted sales invoices…</span>
              ) : (
                value.map((inv) => (
                  <span
                    key={inv.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
                  >
                    {inv.invoiceNo}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(inv.id);
                        }}
                        className="hover:text-brand-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
              <input
                placeholder="Search invoice…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No invoices found</p>
            ) : (
              filtered.map((opt) => {
                const selected = selectedIds.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                      selected && "bg-brand-50",
                    )}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block font-mono text-xs font-semibold text-brand-700 truncate">
                        {opt.invoiceNo}
                      </span>
                      {opt.sub && (
                        <span className="block text-[11px] text-muted-foreground truncate">{opt.sub}</span>
                      )}
                    </span>
                    {selected && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
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

export function formatLinkedInvoiceNos(invoices: CreditNoteLinkedInvoice[] | undefined): string {
  if (!invoices?.length) return "";
  return invoices.map((i) => i.invoiceNo).join(", ");
}
