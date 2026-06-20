"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Check, ChevronsUpDown, Trash2 } from "lucide-react";
import {
  applyProductToInvoiceLine,
  calcGstLineSplit,
  createEmptyLine,
  recalculateLineItem,
  type InvoiceLineItem,
  type InvoiceProductOption,
} from "../invoices-data";
import { formatINR } from "../invoice-utils";
import { MasterFetchedBadge } from "@/components/accounts/master-fetch/MasterFetchedBadge";

const NUM_INPUT_CLASS =
  "h-8 text-sm tabular-nums text-right min-w-[5.5rem] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

function ProductSelect({
  products,
  value,
  onSelect,
  disabled,
}: {
  products: InvoiceProductOption[];
  value: number | null;
  onSelect: (p: InvoiceProductOption) => void;
  disabled?: boolean;
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
    <Popover open={open && !disabled} onOpenChange={(v) => { if (!disabled) setOpen(v); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full h-8 px-2.5 text-sm text-left border border-border rounded-md bg-background flex items-center justify-between",
            disabled && "opacity-70 cursor-default bg-muted/20",
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? `${selected.code} — ${selected.name}` : "Type or click to select an item…"}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pl-8"
            />
          </div>
        </div>
        <div className="max-h-[220px] overflow-y-auto py-1">
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
                "w-full flex items-center gap-2 px-2.5 py-2 text-sm text-left hover:bg-muted/60",
                value === p.id && "bg-brand-50",
              )}
            >
              <span className="font-mono text-brand-700 shrink-0">{p.code}</span>
              <span className="flex-1 truncate">{p.name}</span>
              {value === p.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
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
  interstate = false,
  hideMasterHint = false,
  manualEntry = true,
}: {
  lines: InvoiceLineItem[];
  products: InvoiceProductOption[];
  onChange: (lines: InvoiceLineItem[]) => void;
  interstate?: boolean;
  hideMasterHint?: boolean;
  /** When false (dispatch-sourced invoice), lines are read-only. */
  manualEntry?: boolean;
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

  const headers = interstate
    ? ["Item Details", "HSN/SAC", "Quantity", "Unit", "Rate", "Discount %", "Amount", "GST %", "IGST", ""]
    : ["Item Details", "HSN/SAC", "Quantity", "Unit", "Rate", "Discount %", "Amount", "GST %", "CGST", "SGST", ""];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        {!hideMasterHint ? (
          <div className="flex items-center gap-2 flex-wrap">
            <MasterFetchedBadge />
            <span className="text-xs text-muted-foreground">Products from Product Master</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {manualEntry ? "Add products for manual invoice." : "Line items from selected dispatch."}
          </span>
        )}
        {manualEntry && (
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={addRow}>
            <Plus className="w-3.5 h-3.5" /> Add New Row
          </Button>
        )}
      </div>

      <div className="overflow-x-auto border border-border/60 rounded-lg bg-white">
        <table className="w-full text-sm min-w-[960px]">
          <thead className="bg-muted/40 border-b border-border/60">
            <tr>
              {headers.map((h) => (
                <th
                  key={h || "actions"}
                  className={cn(
                    "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    h && ["Quantity", "Rate", "Discount %", "Amount", "GST %", "CGST", "SGST", "IGST"].includes(h) && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-10 text-center text-sm text-muted-foreground">
                  Add at least one product or service line.
                </td>
              </tr>
            ) : (
              lines.map((line) => {
                const split = calcGstLineSplit(line, interstate);
                return (
                  <tr key={line.id} className="border-b border-border/40 last:border-b-0">
                    <td className="p-2 min-w-[260px]">
                      <ProductSelect
                        products={products}
                        value={line.productId}
                        onSelect={(p) => update(line.id, { productId: p.id })}
                        disabled={!manualEntry}
                      />
                      {!line.productId && manualEntry && (
                        <Input
                          className="h-8 text-sm mt-1.5"
                          placeholder="Or enter item name"
                          value={line.productName}
                          onChange={(e) => update(line.id, { productName: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="p-2 w-[100px]">
                      <Input
                        className="h-8 text-sm font-mono bg-muted/20"
                        placeholder="HSN"
                        value={line.hsn ?? ""}
                        readOnly={!manualEntry || !!line.productId}
                        onChange={(e) => update(line.id, { hsn: e.target.value })}
                      />
                    </td>
                    <td className="p-2 w-[100px]">
                      <Input
                        type="number"
                        min={0}
                        className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
                        value={line.qty || ""}
                        readOnly={!manualEntry}
                        onChange={(e) => update(line.id, { qty: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2 w-[88px]">
                      <Input
                        className="h-8 text-sm text-center bg-muted/20"
                        value={line.unit}
                        readOnly={!manualEntry || !!line.productId}
                        onChange={(e) => update(line.id, { unit: e.target.value })}
                      />
                    </td>
                    <td className="p-2 w-[108px]">
                      <Input
                        type="number"
                        min={0}
                        className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
                        value={line.unitPrice || ""}
                        readOnly={!manualEntry}
                        onChange={(e) => update(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2 w-[96px]">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        className={cn(NUM_INPUT_CLASS, !manualEntry && "bg-muted/20")}
                        value={line.discountPct || ""}
                        readOnly={!manualEntry}
                        onChange={(e) => update(line.id, { discountPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2 w-[120px] tabular-nums text-right font-medium whitespace-nowrap">
                      {formatINR(split.taxable)}
                    </td>
                    <td className="p-2 w-[80px]">
                      <Input
                        type="number"
                        min={0}
                        className={cn(NUM_INPUT_CLASS, "bg-muted/20")}
                        value={line.taxPct || ""}
                        readOnly={!manualEntry || !!line.productId}
                        onChange={(e) => update(line.id, { taxPct: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    {!interstate && (
                      <>
                        <td className="p-2 w-[100px] tabular-nums text-right text-muted-foreground whitespace-nowrap">
                          {split.cgst > 0 ? formatINR(split.cgst) : "—"}
                        </td>
                        <td className="p-2 w-[100px] tabular-nums text-right text-muted-foreground whitespace-nowrap">
                          {split.sgst > 0 ? formatINR(split.sgst) : "—"}
                        </td>
                      </>
                    )}
                    {interstate && (
                      <td className="p-2 w-[100px] tabular-nums text-right text-muted-foreground whitespace-nowrap">
                        {split.igst > 0 ? formatINR(split.igst) : "—"}
                      </td>
                    )}
                    <td className="p-2 w-10">
                      {manualEntry && (
                        <button
                          type="button"
                          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-50 text-red-600"
                          onClick={() => removeRow(line.id)}
                          aria-label="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
