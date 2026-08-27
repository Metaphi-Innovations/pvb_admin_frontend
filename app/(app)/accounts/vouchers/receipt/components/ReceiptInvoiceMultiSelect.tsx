"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { ReceiptUiAllocation } from "../receipt-voucher-utils";

export function ReceiptInvoiceMultiSelect({
  allocations,
  selectedIds,
  onChange,
  disabled,
  loading,
  emptyHint,
  label = "Select Invoice(s)",
}: {
  allocations: ReceiptUiAllocation[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyHint?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return allocations;
    return allocations.filter(
      (a) =>
        a.document_number.toLowerCase().includes(term) ||
        a.document_date.toLowerCase().includes(term) ||
        a.open_item_type.toLowerCase().includes(term),
    );
  }, [allocations, q]);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedRows = allocations.filter((a) => selectedSet.has(a.open_item_id));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover
        open={open && !disabled}
        onOpenChange={(v) => {
          if (!disabled) {
            setOpen(v);
            if (!v) setQ("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "w-full min-h-9 px-3 py-1.5 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between gap-2",
              disabled
                ? "opacity-50 cursor-not-allowed bg-muted/30"
                : "hover:bg-muted/30",
            )}
          >
            <div className="flex-1 min-w-0 flex flex-wrap gap-1">
              {selectedRows.length === 0 ? (
                <span className="text-muted-foreground">
                  {loading
                    ? "Loading…"
                    : allocations.length === 0
                      ? emptyHint || "No invoices available"
                      : "Search and select invoice(s)…"}
                </span>
              ) : (
                selectedRows.map((row) => (
                  <span
                    key={row.open_item_id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium bg-brand-50 border border-brand-200 text-brand-700 rounded-md"
                  >
                    <span className="font-mono">{row.document_number}</span>
                    {!disabled ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="hover:text-brand-900"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(
                            selectedIds.filter((id) => id !== row.open_item_id),
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onChange(
                              selectedIds.filter((id) => id !== row.open_item_id),
                            );
                          }
                        }}
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : null}
                  </span>
                ))
              )}
            </div>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[320px] p-0"
          align="start"
        >
          <div className="p-2 border-b border-border">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search invoice…"
              className="w-full h-8 px-2 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No matching invoices
              </p>
            ) : (
              filtered.map((row) => {
                const checked = selectedSet.has(row.open_item_id);
                return (
                  <button
                    key={row.open_item_id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-muted/60",
                      checked && "bg-brand-50",
                    )}
                    onClick={() => toggle(row.open_item_id)}
                  >
                    <span
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                        checked
                          ? "bg-brand-600 border-brand-600 text-white"
                          : "border-border",
                      )}
                    >
                      {checked ? <Check className="w-3 h-3" /> : null}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-mono font-semibold text-brand-700 text-xs">
                        {row.document_number}
                      </span>
                      <span className="block text-[11px] text-muted-foreground truncate">
                        {[
                          row.document_date || null,
                          `Outstanding ${formatMoney(row.outstanding_amount)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
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
