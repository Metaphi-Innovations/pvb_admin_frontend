"use client";

import React, { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, ChevronsUpDown, Search, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";
import {
  computeLineTaxBreakdown,
  recalculateLineItem,
  type TaxSupplyType,
} from "@/app/(app)/sales/orders/orders-data";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";
import {
  createEmptyLineItem,
  type TransferLineItem,
} from "../stock-transfer-data";
import { getStockStatus } from "@/lib/accounts/inventory-accounting-data";
import { StockTransferService } from "@/services/stock-transfer.service";

const TAX_HEAD =
  "px-2 py-1.5 text-right text-[10px] font-semibold text-foreground whitespace-nowrap";
const TAX_CELL = "px-2 py-1.5 text-xs tabular-nums text-right";
const TAX_CELL_AMT = "px-2 py-1.5 text-xs tabular-nums text-right font-medium";

function formatRupee(n: number): string {
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface TransferProductLinesEditorProps {
  lines: TransferLineItem[];
  products: ProductCatalogItem[];
  sourceWarehouseId: number | null;
  targetWarehouseId: number | null;
  onChange: (lines: TransferLineItem[]) => void;
  error?: string;
  errors?: Record<string, string>;
  taxSupplyType?: TaxSupplyType;
}

export default function TransferProductLinesEditor({
  lines,
  products,
  sourceWarehouseId,
  targetWarehouseId,
  onChange,
  error,
  errors,
  taxSupplyType: propTaxSupplyType,
}: TransferProductLinesEditorProps) {
  useEffect(() => {
    setWarehouseBatches({});
    setTopSelectedBatch(null);
  }, [sourceWarehouseId]);

  const taxSupplyType: TaxSupplyType = useMemo(() => {
    if (propTaxSupplyType) return propTaxSupplyType;
    const source = loadWarehouses().find((w) => w.id === sourceWarehouseId);
    const target = loadWarehouses().find((w) => w.id === targetWarehouseId);
    if (!source || !target) return "intra";
    return source.state === target.state ? "intra" : "inter";
  }, [sourceWarehouseId, targetWarehouseId, propTaxSupplyType]);

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, patch: Partial<TransferLineItem>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const product = products.find((p) => p.id === (patch.productId ?? line.productId));
        let next: TransferLineItem = { ...line, ...patch };

        if (patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
          if (next.quantityType === "Case") {
            next.pieceQuantity = 0;
          }
          next.quantity = next.quantityType === "Case"
            ? ((next.caseQuantity || 0) * (product?.packSize || 1))
            : ((next.caseQuantity || 0) * (product?.packSize || 1)) + (next.pieceQuantity || 0);
        }

        if (product?.gstRate) {
          const breakdown = computeLineTaxBreakdown(next, product.gstRate, taxSupplyType);
          next = {
            ...next,
            gstRate: product.gstRate,
            gstAmount: breakdown.gstAmount,
            cgstAmount: breakdown.cgstAmount,
            sgstAmount: breakdown.sgstAmount,
            igstAmount: breakdown.igstAmount,
          };
        }

        next = recalculateLineItem(next) as TransferLineItem;
        return next;
      }),
    );
  };

  const [topSelectedProducts, setTopSelectedProducts] = useState<ProductCatalogItem[]>([]);
  const [topSelectedBatch, setTopSelectedBatch] = useState<any | null>(null);
  const [topInputQty, setTopInputQty] = useState<string>("1");
  const [topQuantityType, setTopQuantityType] = useState<"Case" | "Piece">("Piece");
  const [localError, setLocalError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<TransferLineItem> | null>(null);

  const updateDraft = (patch: Partial<TransferLineItem>) => {
    setEditDraft((prev) => {
      if (!prev) return prev;
      let next = { ...prev, ...patch } as TransferLineItem;
      const product = products.find((p) => p.id === next.productId);

      if (patch.caseQuantity !== undefined || patch.pieceQuantity !== undefined || patch.quantityType !== undefined) {
        if (next.quantityType === "Case") {
          next.pieceQuantity = 0;
        }
        next.quantity = next.quantityType === "Case"
          ? ((next.caseQuantity || 0) * (product?.packSize || 1))
          : ((next.caseQuantity || 0) * (product?.packSize || 1)) + (next.pieceQuantity || 0);
      }

      if (product?.gstRate) {
        const breakdown = computeLineTaxBreakdown(next, product.gstRate, taxSupplyType);
        next = {
          ...next,
          gstRate: product.gstRate,
          gstAmount: breakdown.gstAmount,
          cgstAmount: breakdown.cgstAmount,
          sgstAmount: breakdown.sgstAmount,
          igstAmount: breakdown.igstAmount,
        };
      }

      next = recalculateLineItem(next) as TransferLineItem;
      return next;
    });
  };
  const [warehouseBatches, setWarehouseBatches] = useState<Record<string | number, any[]>>({});

  const handleAddProductFromTop = () => {
    if (!sourceWarehouseId) {
      setLocalError("Please select From Warehouse first.");
      return;
    }
    if (topSelectedProducts.length === 0) {
      setLocalError("Please select at least one product.");
      return;
    }

    const nextLines = [...lines];
    const errors: string[] = [];

    for (const selectedProduct of topSelectedProducts) {
      const qtyVal = Number(topInputQty) || 0;
      const packSize = selectedProduct.packSize || 1;
      const qty = topQuantityType === "Case"
        ? (qtyVal * packSize)
        : qtyVal;

      if (qty <= 0) {
        errors.push(`Transfer Qty must be greater than zero for "${selectedProduct.name}".`);
        continue;
      }

      const exists = nextLines.some(
        (l) => l.productId === selectedProduct.id && l.quantityType === topQuantityType
      );
      if (exists) {
        errors.push(`Product "${selectedProduct.name}" with type "${topQuantityType}" is already added.`);
        continue;
      }

      let newLine = createEmptyLineItem() as TransferLineItem;
      newLine.productId = selectedProduct.id;
      newLine.productCode = selectedProduct.code;
      newLine.productName = selectedProduct.name;
      const costPrice = selectedProduct.costPrice ?? 0;
      newLine.dealerPrice = costPrice;
      newLine.unitPrice = costPrice;
      newLine.finalRate = costPrice;
      newLine.gstRate = selectedProduct.gstRate;
      newLine.quantityType = topQuantityType;
      if (topQuantityType === "Case") {
        newLine.caseQuantity = qtyVal;
        newLine.pieceQuantity = 0;
      } else {
        newLine.caseQuantity = 0;
        newLine.pieceQuantity = qtyVal;
      }
      newLine.quantity = qty;
      newLine.availableStock = selectedProduct.stock;

      if (selectedProduct.gstRate) {
        const breakdown = computeLineTaxBreakdown(newLine, selectedProduct.gstRate, taxSupplyType);
        newLine = {
          ...newLine,
          gstAmount: breakdown.gstAmount,
          cgstAmount: breakdown.cgstAmount,
          sgstAmount: breakdown.sgstAmount,
          igstAmount: breakdown.igstAmount,
        };
      }

      newLine = recalculateLineItem(newLine) as TransferLineItem;
      nextLines.push(newLine);
    }

    if (errors.length > 0 && nextLines.length === lines.length) {
      setLocalError(errors[0]);
      return;
    }

    onChange(nextLines);
    setTopSelectedProducts([]);
    setTopInputQty("1");
    setLocalError(errors[0] || null);
  };

  const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const totalAmount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

  return (
    <div className="space-y-1.5">
      <ProductItemDetailsSection
        mode="stock-transfer"
        title="Products"
        description="Manage products, quantities, and taxes for this stock transfer."
        items={lines}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        showTotalsInHeader={true}
        quantity={topInputQty}
        onQuantityChange={setTopInputQty}
        onAddItem={handleAddProductFromTop}
        customSelectorArea={
          <MultiProductSelect
            selectedValues={topSelectedProducts.map((p) => p.id)}
            alreadyAddedProductIds={lines.map((l) => l.productId).filter(Boolean)}
            products={products}
            onSelectMultiple={(selected) => {
              setTopSelectedProducts(selected);
              setLocalError(null);
            }}
          />
        }
        customQuantityArea={
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Qty</Label>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  value={topInputQty}
                  onChange={(e) => setTopInputQty(e.target.value)}
                  className="h-8 text-xs w-20 bg-white"
                  placeholder="1"
                />
                <Select
                  value={topQuantityType}
                  onValueChange={(value) => setTopQuantityType(value as "Case" | "Piece")}
                >
                  <SelectTrigger className="h-8 text-xs rounded-lg border-border bg-white w-[90px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[120px]">
                    <SelectItem value="Case">Case</SelectItem>
                    <SelectItem value="Piece">Piece</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        }
        customTableHead={
          <tr className="bg-muted/40 border-b border-border">
            {[
              { h: "Product", className: "w-[240px] text-left" },
              { h: "SKU", className: "text-left" },
              { h: "Quantity", className: "w-[160px] text-right" },
              { h: "CP", className: "text-right" },
            ].map(({ h, className }) => (
              <th
                key={h}
                className={cn(
                  "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap align-middle",
                  className
                )}
              >
                {h}
              </th>
            ))}
            {(taxSupplyType === "intra"
              ? ["CGST", "SGST", "GST"]
              : ["IGST", "GST"]
            ).map((h) => (
              <th key={h} className={TAX_HEAD}>
                {h}
              </th>
            ))}
            {[
              { h: "Total", className: "text-right" },
              { h: "", className: "text-right" },
            ].map(({ h, className }) => (
              <th
                key={h || "actions"}
                className={cn(
                  "px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground align-middle",
                  className,
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        }
        customTableBody={
          lines.map((line, idx) => {
            const batches = warehouseBatches[line.productId ?? ""] || [];
            const product = products.find((p) => p.id === line.productId);
            const selectedBatch = batches.find((b: any) => b.batchNumber === line.batchNumber);
            const isNearExpiry = selectedBatch?.status === "Near Expiry";
            const isExpired = selectedBatch?.status === "Expired";
            const taxBreakdown =
              line.productId && product?.gstRate
                ? computeLineTaxBreakdown(line, product.gstRate, taxSupplyType)
                : null;

            const isEditing = editingId === line.id;
            const draftLine = isEditing && editDraft ? (editDraft as TransferLineItem) : line;
            const lineError = errors?.[`line_${idx}_qty`] || errors?.[`line_${idx}_batch`];

            return (
              <tr
                key={line.id}
                className={cn("border-b border-border/60", isExpired && "bg-red-50/60")}
              >
                <td className="px-3 py-2">
                  <ProductSelect
                    value={line.productId}
                    products={products}
                    onSelect={(p) => {
                      const costPrice = p.costPrice ?? 0;
                      updateLine(line.id, {
                        productId: p.id,
                        productCode: p.code,
                        productName: p.name,
                        availableStock: p.stock,
                        dealerPrice: costPrice,
                        unitPrice: costPrice,
                        finalRate: costPrice,
                        gstRate: p.gstRate,
                        batchNumber: undefined,
                        batchInventoryId: undefined,
                        expiryDate: undefined,
                        mfgDate: undefined,
                      });
                    }}
                  />
                  {lineError && (
                    <p className="text-[10px] text-red-500 font-semibold mt-1">{lineError}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700">
                  {line.productCode || "—"}
                </td>
                <td className='px-2 py-1.5 min-w-[140px] align-top text-right'>
                  <div className="flex flex-col gap-1 w-full text-right">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Input
                          type="number"
                          min={0}
                          value={
                            draftLine.quantityType === "Case"
                              ? (draftLine.caseQuantity === 0 && !draftLine.quantity ? "" : draftLine.caseQuantity)
                              : (draftLine.pieceQuantity === 0 && !draftLine.quantity ? "" : draftLine.pieceQuantity)
                          }
                          onChange={(e) => {
                            const val = e.target.value.slice(0, 5);
                            const num = val ? Number(val) : 0;
                            if (draftLine.quantityType === "Case") {
                              updateDraft({ caseQuantity: num });
                            } else {
                              updateDraft({ pieceQuantity: num });
                            }
                          }}
                          className="h-7 text-xs w-16 text-right tabular-nums"
                        />
                        <Select
                          value={draftLine.quantityType || "Piece"}
                          onValueChange={(value) => {
                            const type = value as "Case" | "Piece";
                            const currentVal = draftLine.quantityType === "Case" ? draftLine.caseQuantity : draftLine.pieceQuantity;
                            if (type === "Case") {
                              updateDraft({ quantityType: type, caseQuantity: currentVal || 0, pieceQuantity: 0 });
                            } else {
                              updateDraft({ quantityType: type, pieceQuantity: currentVal || 0, caseQuantity: 0 });
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 text-[10px] rounded border-border bg-white w-[54px] px-1.5 shrink-0">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent className="min-w-[100px]">
                            <SelectItem value="Case">Case</SelectItem>
                            <SelectItem value="Piece">Piece</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-foreground">
                        {line.quantityType === "Case" ? line.caseQuantity : line.pieceQuantity} {line.quantityType || "Piece"}
                      </span>
                    )}

                    {/* Stacked details */}
                    {draftLine.productId && product && (
                      (() => {
                        const uomLower = (product.uom || "").toLowerCase();
                        const unitSize = Number(product.unitPackSize) || 0;
                        let weightStr = "";
                        if (uomLower === "ml") {
                          weightStr = `${((draftLine.quantity * unitSize) / 1000).toFixed(2)} Ltr`;
                        } else if (uomLower === "gms" || uomLower === "gram" || uomLower === "grams") {
                          weightStr = `${((draftLine.quantity * unitSize) / 1000).toFixed(2)} Kg`;
                        } else if (uomLower === "ltr" || uomLower === "kg") {
                          weightStr = `${(draftLine.quantity * (unitSize || 1)).toFixed(2)} ${product.uom}`;
                        } else if (product.netWeight) {
                          weightStr = `${(draftLine.quantity * product.netWeight).toFixed(2)} ${["ml", "ltr"].includes(uomLower) ? "Ltr" : "Kg"}`;
                        }
                        return (
                          <div className="text-right space-y-0.5 leading-tight text-[10px] text-muted-foreground border-t border-slate-100 pt-1">
                            <p>
                              Total units: <span className="font-semibold text-foreground">{draftLine.quantity} </span>
                            </p>
                            {weightStr && (
                              <p>
                                Weight: <span className="font-semibold text-foreground">{weightStr}</span>
                              </p>
                            )}
                            <p className="text-[9px] text-muted-foreground/80">
                              Pack size: {product.packSize || 1}
                            </p>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap text-right">
                  {line.productId ? formatRupee(line.unitPrice ?? 0) : "—"}
                </td>
                {line.productId && product && taxBreakdown ? (
                  taxSupplyType === "intra" ? (
                    <>
                      <td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
                        <div className="flex flex-col">
                          <span className="text-foreground">{formatRupee(line.cgstAmount ?? 0)}</span>
                          <span className="text-[10px] text-muted-foreground">({taxBreakdown.cgstRate}%)</span>
                        </div>
                      </td>
                      <td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
                        <div className="flex flex-col">
                          <span className="text-foreground">{formatRupee(line.sgstAmount ?? 0)}</span>
                          <span className="text-[10px] text-muted-foreground">({taxBreakdown.sgstRate}%)</span>
                        </div>
                      </td>
                      <td className={cn(TAX_CELL_AMT, "min-w-[100px] whitespace-nowrap")}>
                        <div className="flex flex-col">
                          <span className="text-foreground">{formatRupee(line.gstAmount ?? 0)}</span>
                          <span className="text-[10px] text-muted-foreground">({taxBreakdown.cgstRate + taxBreakdown.sgstRate}%)</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TAX_CELL, "min-w-[100px] whitespace-nowrap")}>
                        <div className="flex flex-col">
                          <span className="text-foreground">{formatRupee(line.igstAmount ?? 0)}</span>
                          <span className="text-[10px] text-muted-foreground">({taxBreakdown.igstRate}%)</span>
                        </div>
                      </td>
                      <td className={cn(TAX_CELL_AMT, "min-w-[100px] whitespace-nowrap")}>
                        <div className="flex flex-col">
                          <span className="text-foreground">{formatRupee(line.gstAmount ?? 0)}</span>
                          <span className="text-[10px] text-muted-foreground">({taxBreakdown.igstRate}%)</span>
                        </div>
                      </td>
                    </>
                  )
                ) : (
                  taxSupplyType === "intra" ? (
                    <>
                      <td className={cn(TAX_CELL, "min-w-[100px]")}>—</td>
                      <td className={cn(TAX_CELL, "min-w-[100px]")}>—</td>
                      <td className={cn(TAX_CELL, "min-w-[100px]")}>—</td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TAX_CELL, "min-w-[100px]")}>—</td>
                      <td className={cn(TAX_CELL, "min-w-[100px]")}>—</td>
                    </>
                  )
                )}
                <td className="px-3 py-2 text-xs font-semibold tabular-nums whitespace-nowrap text-right">
                  {line.productId ? formatRupee(line.lineTotal ?? 0) : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-0.5">
                    {isEditing ? (
                      <>
                        <button
                          type='button'
                          onClick={() => {
                            if (editDraft) {
                              updateLine(line.id, editDraft);
                            }
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className='p-1.5 hover:bg-emerald-50 rounded-md transition-colors'
                          title='Save changes'
                        >
                          <Check className='w-3.5 h-3.5 text-emerald-600' />
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            setEditingId(null);
                            setEditDraft(null);
                          }}
                          className='p-1.5 hover:bg-red-50 rounded-md transition-colors'
                          title='Cancel editing'
                        >
                          <X className='w-3.5 h-3.5 text-red-500' />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type='button'
                          onClick={() => {
                            setEditingId(line.id);
                            setEditDraft({ ...line });
                          }}
                          className='p-1.5 hover:bg-muted rounded-md transition-colors'
                          title='Edit row'
                        >
                          <Pencil className='w-3.5 h-3.5 text-muted-foreground' />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })
        }
        customTableFooter={
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">{lines.length}</span> product(s) selected
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                Total unit qty:{" "}
                <span className="font-medium text-foreground tabular-nums">{totalQuantity}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total amount:{" "}
                <span className="font-medium text-foreground tabular-nums font-mono">
                  {formatRupee(totalAmount)}
                </span>
              </p>
            </div>
          </div>
        }
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {localError && (
        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {localError}
        </p>
      )}
    </div>
  );
}

function MultiProductSelect({
  products,
  selectedValues = [],
  alreadyAddedProductIds = [],
  onSelectMultiple,
}: {
  products: ProductCatalogItem[];
  selectedValues?: Array<string | number>;
  alreadyAddedProductIds?: Array<string | number | null | undefined>;
  onSelectMultiple: (selectedProducts: ProductCatalogItem[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [checkedIds, setCheckedIds] = useState<Array<string | number>>([]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      setCheckedIds(selectedValues);
    } else {
      setSearch("");
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleProduct = (id: string | number) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleDone = () => {
    setOpen(false);
    setSearch("");
    const selectedProds = products.filter((p) => checkedIds.includes(p.id));
    onSelectMultiple(selectedProds);
  };

  const getTriggerLabel = () => {
    if (selectedValues.length > 1) return `${selectedValues.length} products selected`;
    if (selectedValues.length === 1) {
      const selected = products.find((p) => p.id === selectedValues[0]);
      return selected ? `${selected.code} — ${selected.name}` : "Select product…";
    }
    return "Select product…";
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-8 px-2 text-xs text-left border border-border rounded-lg flex items-center justify-between"
        >
          <span className={selectedValues.length > 0 ? "text-foreground truncate" : "text-muted-foreground"}>
            {getTriggerLabel()}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              placeholder="Search…"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto py-1">
          {filtered.map((product) => {
            const isChecked = checkedIds.includes(product.id);
            const isAlreadyAdded = alreadyAddedProductIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => toggleProduct(product.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted/60",
                  isChecked && "bg-brand-50",
                  isAlreadyAdded && "opacity-50 cursor-not-allowed bg-muted/10",
                )}
              >
                <Checkbox
                  checked={isChecked || isAlreadyAdded}
                  disabled={isAlreadyAdded}
                  className="w-3.5 h-3.5 flex-shrink-0 pointer-events-none"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold block truncate">{product.name}</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono text-[10px] text-brand-700">{product.code}</span>
                    <span className="text-[10px] text-muted-foreground">Stock: {product.stock}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="p-2 border-t border-border flex justify-end">
          <Button type="button" size="sm" className="h-7 text-xs" onClick={handleDone}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ProductSelect({
  value,
  products,
  onSelect,
}: {
  value: number | string | null;
  products: ProductCatalogItem[];
  onSelect: (product: ProductCatalogItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = products.find((p) => p.id === value);
  const filtered = products.filter((p) =>
    `${p.code} ${p.name}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-8 px-2 text-xs text-left border border-border rounded-lg flex items-center justify-between"
        >
          <span className={selected ? "text-foreground truncate" : "text-muted-foreground"}>
            {selected ? selected.name : "Select product…"}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              placeholder="Search…"
            />
          </div>
        </div>
        <div className="max-h-[200px] overflow-y-auto">
          {filtered.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onSelect(product);
                setOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-xs text-left hover:bg-muted/60",
                value === product.id && "bg-brand-50",
              )}
            >
              <span className="font-semibold block">{product.name}</span>
              <div className="flex items-center justify-between mt-0.5">
                <span className="font-mono text-[10px] text-brand-700">{product.code}</span>
                <span className="text-[10px] text-muted-foreground">Stock: {product.stock}</span>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}


