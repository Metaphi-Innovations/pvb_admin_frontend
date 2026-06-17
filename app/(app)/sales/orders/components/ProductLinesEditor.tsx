"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Search, Check, ChevronsUpDown, Trash2, Pencil, AlertCircle,
} from "lucide-react";
import {
  type SalesOrderLineItem,
  type ProductCatalogItem,
  createEmptyLineItem,
  applyProductToLine,
  recalculateLineItem,
  computeGstAmount,
  getProductById,
} from "../orders-data";

interface ProductLinesEditorProps {
  lines: SalesOrderLineItem[];
  products: ProductCatalogItem[];
  onChange: (lines: SalesOrderLineItem[]) => void;
  error?: string;
}

function ProductSelect({
  products,
  value,
  onSelect,
}: {
  products: ProductCatalogItem[];
  value: number | null;
  onSelect: (product: ProductCatalogItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find(p => p.id === value);
  const filtered = products.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-7 px-2 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30"
        >
          <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
            {selected ? `${selected.code} — ${selected.name}` : "Select product…"}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search product…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onSelect(p); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60",
                value === p.id && "bg-brand-50",
              )}
            >
              <span className="font-mono text-brand-700 flex-shrink-0">{p.code}</span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">Stock: {p.stock}</span>
              {value === p.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">No products found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ProductLinesEditor({
  lines,
  products,
  onChange,
  error,
}: ProductLinesEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const updateLine = (id: string, patch: Partial<SalesOrderLineItem>) => {
    onChange(
      lines.map(line => {
        if (line.id !== id) return line;
        let next = { ...line, ...patch };
        if (patch.productId !== undefined && patch.productId !== null) {
          const product = getProductById(patch.productId);
          if (product) next = applyProductToLine(next, product);
        } else if (
          patch.quantity !== undefined ||
          patch.unitPrice !== undefined ||
          patch.discount !== undefined
        ) {
          const product = next.productId ? getProductById(next.productId) : undefined;
          if (product) {
            next.gstAmount = computeGstAmount(
              next.quantity,
              next.unitPrice,
              next.discount,
              product.gstRate,
            );
          }
          next = recalculateLineItem(next);
        } else if (patch.gstAmount !== undefined) {
          next = recalculateLineItem(next);
        }
        return next;
      }),
    );
  };

  const addLine = () => {
    const newLine = createEmptyLineItem();
    onChange([...lines, newLine]);
    setEditingId(newLine.id);
  };

  const removeLine = (id: string) => {
    onChange(lines.filter(l => l.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleProductSelect = (lineId: string, product: ProductCatalogItem) => {
    onChange(
      lines.map(line =>
        line.id === lineId ? applyProductToLine(line, product) : line,
      ),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={addLine}
        >
          <Plus className="w-3 h-3" /> Add Product
        </Button>
      </div>

      {lines.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-6 text-center">
          <p className="text-xs text-muted-foreground">No products — click Add Product</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {[
                    { h: "Product", className: "" },
                    { h: "Stock", className: "w-16" },
                    { h: "Qty", className: "w-16" },
                    { h: "Unit Price", className: "min-w-[120px] w-32" },
                    { h: "Discount (%)", className: "w-24" },
                    { h: "GST % / Amt", className: "min-w-[120px] w-20" },
                    { h: "Item Total", className: "min-w-[100px]" },
                    { h: "", className: "w-16" },
                  ].map(({ h, className }) => (
                    <th
                      key={h || "actions"}
                      className={cn("px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap", className)}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map(line => {
                  const isEditing = editingId === line.id;
                  const product = line.productId ? getProductById(line.productId) : undefined;
                  return (
                    <tr key={line.id} className="border-b border-border/60 hover:bg-muted/10">
                      <td className="px-2 py-1.5 min-w-[180px]">
                        <ProductSelect
                          products={products}
                          value={line.productId}
                          onSelect={p => handleProductSelect(line.id, p)}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <span
                          className={cn(
                            "text-xs font-medium tabular-nums",
                            line.availableStock === 0 ? "text-amber-600" : "text-foreground",
                          )}
                        >
                          {line.productId != null ? line.availableStock : "—"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 w-16">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            value={line.quantity || ""}
                            onChange={e => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                            className="h-7 text-xs"
                          />
                        ) : (
                          <span className="text-xs">{line.quantity}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 min-w-[120px] w-32">
                        {isEditing ? (
                          <Input
                            type="number"
                            min={0}
                            value={line.unitPrice || ""}
                            onChange={e => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                            className="h-7 text-xs w-full min-w-[100px]"
                          />
                        ) : (
                          <span className="text-xs whitespace-nowrap">₹{line.unitPrice.toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 w-24">
                        {isEditing ? (
                          <div className="relative flex items-center">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={line.discount || ""}
                              onChange={e => updateLine(line.id, { discount: Number(e.target.value) || 0 })}
                              className="h-7 text-xs pr-6 w-full"
                            />
                            <span className="absolute right-2 text-[10px] text-muted-foreground pointer-events-none">%</span>
                          </div>
                        ) : (
                          <span className="text-xs">{line.discount}%</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5 min-w-[120px] w-20">
                        {isEditing ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[10px] text-muted-foreground font-semibold">{product?.gstRate || "0%"}</span>
                            <Input
                              type="number"
                              min={0}
                              value={line.gstAmount || ""}
                              onChange={e => updateLine(line.id, { gstAmount: Number(e.target.value) || 0 })}
                              className="h-7 text-xs w-full min-w-[100px]"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-semibold">{product?.gstRate || "0%"}</span>
                            <span className="text-xs">₹{line.gstAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-xs font-semibold text-foreground">
                          ₹{line.lineTotal.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-0.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingId(isEditing ? null : line.id)}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            title={isEditing ? "Done editing" : "Edit row"}
                          >
                            <Pencil className={cn("w-3.5 h-3.5", isEditing ? "text-brand-600" : "text-muted-foreground")} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(line.id)}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
