"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import {
  applyProductToInvoiceLine,
  calcLineAmounts,
  createEmptyLine,
  recalculateLineItem,
  type InvoiceLineItem,
  type InvoiceProductOption,
} from "../invoices-data";
import { formatINR } from "../invoice-utils";

function ProductSelect({
  products,
  value,
  onSelect,
}: {
  products: InvoiceProductOption[];
  value: number | null;
  onSelect: (p: InvoiceProductOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find((p) => p.id === value);
  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-7 px-2 text-xs text-left border border-border rounded-md bg-background flex items-center justify-between"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? `${selected.code} — ${selected.name}` : "Select product…"}
          </span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs pl-7"
            />
          </div>
        </div>
        <div className="max-h-[180px] overflow-y-auto py-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onSelect(p);
                setOpen(false);
                setSearch("");
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-xs text-left hover:bg-muted/60",
                value === p.id && "bg-brand-50",
              )}
            >
              <span className="font-mono text-brand-700 shrink-0">{p.code}</span>
              <span className="flex-1 truncate">{p.name}</span>
              {value === p.id && <Check className="w-3 h-3 text-brand-600" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function InvoiceLinesEditor({
  lines,
  products,
  onChange,
}: {
  lines: InvoiceLineItem[];
  products: InvoiceProductOption[];
  onChange: (lines: InvoiceLineItem[]) => void;
}) {
  const update = (id: string, patch: Partial<InvoiceLineItem>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        let next = { ...line, ...patch };
        if (patch.productId != null) {
          const product = products.find((p) => p.id === patch.productId);
          if (product) next = applyProductToInvoiceLine(next, product);
        } else {
          next = recalculateLineItem(next);
        }
        return next;
      }),
    );
  };

  const addRow = () => onChange([...lines, createEmptyLine()]);
  const removeRow = (id: string) => onChange(lines.filter((l) => l.id !== id));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Line items</p>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addRow}>
          <Plus className="w-3 h-3" /> Add Row
        </Button>
      </div>
      <div className="overflow-x-auto border border-border/60 rounded-lg">
        <table className="w-full text-xs min-w-[920px]">
          <thead className="bg-muted/30 border-b">
            <tr>
              {["Product / Service", "Description", "Qty", "Unit", "Unit Price", "Disc %", "Tax %", "Amount", ""].map(
                (h) => (
                  <th key={h || "x"} className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-muted-foreground">
                  Add at least one product or service line.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const { amount } = calcLineAmounts(line);
                return (
                  <tr key={line.id} className="border-b border-border/40">
                    <td className="p-1.5 min-w-[160px]">
                      <ProductSelect
                        products={products}
                        value={line.productId}
                        onSelect={(p) => update(line.id, { productId: p.id })}
                      />
                      {!line.productId && (
                        <Input
                          className="h-7 text-xs mt-1"
                          placeholder="Or enter name"
                          value={line.productName}
                          onChange={(e) => update(line.id, { productName: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="p-1.5">
                      <Input
                        className="h-7 text-xs min-w-[120px]"
                        value={line.description}
                        onChange={(e) => update(line.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 w-16">
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={line.qty || ""}
                        onChange={(e) => update(line.id, { qty: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-1.5 w-16">
                      <Input
                        className="h-7 text-xs"
                        value={line.unit}
                        onChange={(e) => update(line.id, { unit: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 w-24">
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={line.unitPrice || ""}
                        onChange={(e) => update(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-1.5 w-16">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className="h-7 text-xs"
                        value={line.discountPct || ""}
                        onChange={(e) => update(line.id, { discountPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-1.5 w-16">
                      <Input
                        type="number"
                        min={0}
                        className="h-7 text-xs"
                        value={line.taxPct || ""}
                        onChange={(e) => update(line.id, { taxPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-1.5 w-24 tabular-nums font-medium whitespace-nowrap">{formatINR(amount)}</td>
                    <td className="p-1.5 w-8">
                      <button
                        type="button"
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-600"
                        onClick={() => removeRow(line.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
