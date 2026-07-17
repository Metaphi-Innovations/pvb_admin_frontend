"use client";

import React, { useMemo, useState, useEffect } from "react";
import { AlertTriangle, Plus, Trash2, ChevronsUpDown, Search, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  "px-2 py-1.5 text-left text-[10px] font-semibold text-foreground whitespace-nowrap";
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

  const [topSelectedProduct, setTopSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [topSelectedBatch, setTopSelectedBatch] = useState<any | null>(null);
  const [topInputQty, setTopInputQty] = useState<string>("1");
  const [topQuantityType, setTopQuantityType] = useState<"Case" | "Piece">("Piece");
  const [topCaseQuantity, setTopCaseQuantity] = useState<number>(0);
  const [topPieceQuantity, setTopPieceQuantity] = useState<number>(0);
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

  const fetchBatchesForProduct = async (productId: string | number) => {
    if (!sourceWarehouseId) return;
    if (warehouseBatches[productId]) return;
    try {
      const res = await StockTransferService.getBatches(productId, sourceWarehouseId);
      
      const grouped: Record<string, any> = {};
      res.forEach((b: any) => {
        const code = b.batch_code || "N/A";
        if (!grouped[code]) {
          grouped[code] = {
            productName: "",
            batchInventoryId: b.available_inventory_id,
            batchNumber: code,
            mfgDate: b.mfg_date || null,
            expiryDate: b.expiry_date || null,
            availableQty: 0,
            status: b.expiry_date ? getStockStatus(b.expiry_date) : "Good",
            costPrice: Number(b.unit_cost || 0),
          };
        }
        grouped[code].availableQty += Number(b.available_qty || 0);
      });

      const mapped = Object.values(grouped).filter((b: any) => b.availableQty > 0);
      setWarehouseBatches((prev) => ({ ...prev, [productId]: mapped }));
      return mapped;
    } catch (err) {
      console.error("Failed to fetch batches:", err);
      return [];
    }
  };

  useEffect(() => {
    if (topSelectedProduct && sourceWarehouseId) {
      fetchBatchesForProduct(topSelectedProduct.id).then((batches) => {
        const available = (batches || []).filter(
          (b: any) => !lines.some((line) => line.productId === topSelectedProduct.id && line.batchNumber === b.batchNumber)
        );
        if (available.length > 0) {
          setTopSelectedBatch(available[0]);
        } else {
          setTopSelectedBatch(null);
        }
      });
    }
  }, [topSelectedProduct, sourceWarehouseId, lines]);

  useEffect(() => {
    // Prefetch batches for existing lines
    if (sourceWarehouseId && lines.length > 0) {
      lines.forEach((line) => {
        if (line.productId) {
          fetchBatchesForProduct(line.productId);
        }
      });
    }
  }, [sourceWarehouseId, lines]);

  const topBatches = useMemo(() => {
    if (!topSelectedProduct) return [];
    return warehouseBatches[topSelectedProduct.id] || [];
  }, [warehouseBatches, topSelectedProduct]);

  const handleAddProductFromTop = () => {
    if (!sourceWarehouseId) {
      setLocalError("Please select From Warehouse first.");
      return;
    }
    if (!topSelectedProduct) {
      setLocalError("Please select a product.");
      return;
    }
    if (!topSelectedBatch) {
      setLocalError("Please select a batch.");
      return;
    }
    const qty = topQuantityType === "Case"
      ? (topCaseQuantity * (topSelectedProduct.packSize || 1))
      : (topCaseQuantity * (topSelectedProduct.packSize || 1)) + topPieceQuantity;

    if (qty <= 0) {
      setLocalError("Transfer Qty must be greater than zero.");
      return;
    }
    if (qty > topSelectedBatch.availableQty) {
      setLocalError("Transfer Qty cannot exceed available quantity.");
      return;
    }

    // Check duplicate
    const exists = lines.some(
      (l) => l.productId === topSelectedProduct.id && l.batchNumber === topSelectedBatch.batchNumber
    );
    if (exists) {
      setLocalError(`Batch "${topSelectedBatch.batchNumber}" of product "${topSelectedProduct.name}" is already added.`);
      return;
    }

    let newLine = createEmptyLineItem() as TransferLineItem;
    newLine.productId = topSelectedProduct.id;
    newLine.productCode = topSelectedProduct.code;
    newLine.productName = topSelectedProduct.name;
    newLine.batchNumber = topSelectedBatch.batchNumber;
    newLine.batchInventoryId = topSelectedBatch.batchInventoryId;
    newLine.mfgDate = topSelectedBatch.mfgDate;
    newLine.expiryDate = topSelectedBatch.expiryDate;
    newLine.availableStock = topSelectedBatch.availableQty;
    const cp = topSelectedBatch.costPrice || 0;
    newLine.dealerPrice = cp;
    newLine.unitPrice = cp;
    newLine.finalRate = cp;
    newLine.gstRate = topSelectedProduct.gstRate;
    newLine.quantityType = topQuantityType;
    newLine.caseQuantity = topCaseQuantity;
    newLine.pieceQuantity = topPieceQuantity;
    newLine.quantity = qty;

    if (topSelectedProduct.gstRate) {
      const breakdown = computeLineTaxBreakdown(newLine, topSelectedProduct.gstRate, taxSupplyType);
      newLine = {
        ...newLine,
        gstAmount: breakdown.gstAmount,
        cgstAmount: breakdown.cgstAmount,
        sgstAmount: breakdown.sgstAmount,
        igstAmount: breakdown.igstAmount,
      };
    }

    newLine = recalculateLineItem(newLine) as TransferLineItem;
    onChange([...lines, newLine]);
    setTopSelectedProduct(null);
    setTopSelectedBatch(null);
    setTopCaseQuantity(0);
    setTopPieceQuantity(0);
    setLocalError(null);
  };

  const totalQuantity = lines.reduce((sum, line) => sum + (line.quantity || 0), 0);
  const totalAmount = lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

  return (
    <div className="space-y-1.5">
      <ProductItemDetailsSection
        mode="stock-transfer"
        title="Products"
        description="Manage products, batches, quantities, and taxes for this stock transfer."
        items={lines}
        totalQuantity={totalQuantity}
        totalAmount={totalAmount}
        showTotalsInHeader={true}
        quantity={topInputQty}
        onQuantityChange={setTopInputQty}
        onAddItem={handleAddProductFromTop}
        customSelectorArea={
          <ProductSelect
            value={topSelectedProduct ? topSelectedProduct.id : null}
            products={products}
            onSelect={(p) => {
              setTopSelectedProduct(p);
              setLocalError(null);
            }}
          />
        }
        customBatchSelectorArea={
          <BatchSelect
            productName={topSelectedProduct ? topSelectedProduct.name : ""}
            productCode={topSelectedProduct ? topSelectedProduct.code : ""}
            batches={topBatches}
            value={topSelectedBatch ? topSelectedBatch.batchNumber : undefined}
            disabled={!topSelectedProduct || !sourceWarehouseId}
            alreadyAddedBatchNumbers={lines
              .filter((l) => l.productId === topSelectedProduct?.id)
              .map((l) => l.batchNumber)
              .filter((bn): bn is string => typeof bn === "string")}
            onSelect={(b) => {
              setTopSelectedBatch(b);
              setLocalError(null);
            }}
          />
        }
        customQuantityArea={
          <>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Type</Label>
              <Select
                value={topQuantityType}
                onValueChange={(value) => {
                  const type = value as "Case" | "Piece";
                  setTopQuantityType(type);
                  if (type === "Case") {
                    setTopPieceQuantity(0);
                  }
                }}
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
            <div className="space-y-1">
              <Label className="text-xs font-medium">Cases</Label>
              <Input
                type="number"
                min={0}
                value={topCaseQuantity || ""}
                onChange={(e) => setTopCaseQuantity(Number(e.target.value) || 0)}
                className="h-8 text-xs w-20 bg-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Pieces</Label>
              <Input
                type="number"
                min={0}
                disabled={topQuantityType === "Case"}
                value={topPieceQuantity || ""}
                onChange={(e) => setTopPieceQuantity(Number(e.target.value) || 0)}
                className="h-8 text-xs w-20 bg-white disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Total Unit Qty</Label>
              <Input
                type="text"
                disabled
                value={
                  topSelectedProduct
                    ? (((topCaseQuantity || 0) * (topSelectedProduct.packSize || 1)) + (topPieceQuantity || 0)) || "—"
                    : "—"
                }
                className="h-8 text-xs w-24 font-semibold bg-muted text-muted-foreground"
              />
            </div>
          </>
        }
        customTableHead={
          <tr className="bg-muted/40 border-b border-border">
            {[
              { h: "Product", className: "w-[240px]" },
              { h: "SKU" },
              { h: "Batch No." },
              { h: "Expiry" },
              { h: "Available", className: "w-16" },
              { h: "Type", className: "w-[80px]" },
              { h: "Cases", className: "w-20" },
              { h: "Pieces", className: "w-20" },
              { h: "Total Unit Qty", className: "w-20" },
              { h: "CP" },
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
              { h: "Total" },
              { h: "" },
            ].map(({ h }) => (
              <th
                key={h || "actions"}
                className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground align-middle"
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
                      updateLine(line.id, {
                        productId: p.id,
                        productCode: p.code,
                        productName: p.name,
                        availableStock: p.stock,
                        dealerPrice: p.sellingPrice,
                        unitPrice: p.sellingPrice,
                        finalRate: p.sellingPrice,
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
                <td className="px-3 py-2 min-w-[200px]">
                  <BatchSelect
                    productName={line.productName}
                    productCode={line.productCode}
                    batches={batches}
                    value={line.batchNumber}
                    disabled={!line.productId || !sourceWarehouseId}
                    alreadyAddedBatchNumbers={lines
                      .filter((l) => l.id !== line.id && l.productId === line.productId)
                      .map((l) => l.batchNumber)
                      .filter((bn): bn is string => typeof bn === "string")}
                    onSelect={(batch) => {
                      const cp = batch.costPrice || 0;
                      updateLine(line.id, {
                        batchNumber: batch.batchNumber,
                        batchInventoryId: batch.batchInventoryId,
                        mfgDate: batch.mfgDate ?? undefined,
                        expiryDate: batch.expiryDate ?? undefined,
                        availableStock: batch.availableQty,
                        dealerPrice: cp,
                        unitPrice: cp,
                        finalRate: cp,
                      });
                    }}
                  />
                  {isNearExpiry && (
                    <p className="text-[10px] text-amber-700 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3" /> Near expiry
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{line.expiryDate || "—"}</td>
                <td className="px-3 py-2 text-xs font-bold text-center">
                  {line.batchNumber ? line.availableStock ?? 0 : "—"}
                </td>
                <td className='px-2 py-1.5 w-[80px]'>
                  {isEditing ? (
                    <Select
                      disabled={!line.batchNumber || isExpired}
                      value={draftLine.quantityType || "Piece"}
                      onValueChange={(value) => updateDraft({ quantityType: value as "Case" | "Piece" })}
                    >
                      <SelectTrigger className="h-7 text-xs rounded border-border bg-white w-full px-2">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="min-w-[120px]">
                        <SelectItem value="Case">Case</SelectItem>
                        <SelectItem value="Piece">Piece</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs">{line.quantityType || "Piece"}</span>
                  )}
                </td>
                <td className='px-2 py-1.5 w-20'>
                  {isEditing ? (
                    <Input
                      type="number"
                      min={0}
                      disabled={!line.batchNumber || isExpired}
                      value={draftLine.caseQuantity === 0 && !draftLine.quantity ? "" : draftLine.caseQuantity}
                      onChange={(e) => updateDraft({ caseQuantity: e.target.value ? Number(e.target.value) : 0 })}
                      className="h-7 text-xs w-full"
                    />
                  ) : (
                    <span className="text-xs">{line.caseQuantity || 0}</span>
                  )}
                </td>
                <td className='px-2 py-1.5 w-20'>
                  {isEditing ? (
                    <Input
                      type="number"
                      min={0}
                      disabled={(!line.batchNumber || isExpired) || draftLine.quantityType === "Case"}
                      value={draftLine.pieceQuantity === 0 && !draftLine.quantity ? "" : draftLine.pieceQuantity}
                      onChange={(e) => updateDraft({ pieceQuantity: e.target.value ? Number(e.target.value) : 0 })}
                      className="h-7 text-xs w-full disabled:opacity-50"
                    />
                  ) : (
                    <span className="text-xs">{line.pieceQuantity || 0}</span>
                  )}
                </td>
                <td className='px-2 py-1.5 w-20'>
                  {isEditing ? (
                    <Input
                      type="number"
                      disabled
                      value={draftLine.quantity || ""}
                      className="h-7 text-xs w-full font-semibold bg-muted text-muted-foreground"
                    />
                  ) : (
                    <span className="text-xs font-semibold tabular-nums text-foreground">
                      {line.quantity || 0}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
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
                <td className="px-3 py-2 text-xs font-semibold tabular-nums whitespace-nowrap">
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
                              const avail = editDraft.availableStock ?? 0;
                              const qty = editDraft.quantity ?? 0;
                              if (qty > avail) {
                                alert(`Cannot save: Transfer quantity (${qty}) exceeds available stock (${avail})`);
                                return;
                              }
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

function ProductSelect({
  value,
  products,
  onSelect,
}: {
  value: number | null;
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
              <span className="font-mono text-[10px] text-brand-700">{product.code}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BatchSelect({
  productName,
  productCode,
  batches,
  value,
  disabled,
  alreadyAddedBatchNumbers = [],
  onSelect,
}: {
  productName: string;
  productCode: string;
  batches: { productName: string; batchInventoryId: string; batchNumber: string; mfgDate: string | null; expiryDate: string | null; availableQty: number; status: string; costPrice?: number }[];
  value?: string;
  disabled?: boolean;
  alreadyAddedBatchNumbers?: string[];
  onSelect: (batch: (typeof batches)[number]) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="w-full min-w-[180px] h-8 px-2 text-xs text-left border border-border rounded-lg flex items-center justify-between disabled:opacity-50"
        >
          <span className={value ? "truncate" : "text-muted-foreground"}>
            {value ? (
              <span>
                <span className="text-foreground">{productName || batches[0]?.productName}</span>
                {" · "}
                <span className="font-mono font-semibold">{value}</span>
              </span>
            ) : (
              "Select batch…"
            )}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1 max-h-[280px] overflow-y-auto">
        {batches.length === 0 ? null : (
          batches.map((batch: { productName: string; batchInventoryId: string; batchNumber: string; mfgDate: string | null; expiryDate: string | null; availableQty: number; status: string }) => {
            const isExpired = batch.status === "Expired";
            const isAlreadyAdded = alreadyAddedBatchNumbers.includes(batch.batchNumber);
            return (
              <button
                key={batch.batchNumber}
                type="button"
                disabled={isExpired || isAlreadyAdded}
                onClick={() => {
                  if (isExpired || isAlreadyAdded) return;
                  onSelect(batch);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 text-xs text-left rounded-lg transition-colors",
                  (isExpired || isAlreadyAdded)
                    ? "opacity-50 cursor-not-allowed bg-red-50/50"
                    : "hover:bg-muted/60",
                  value === batch.batchNumber && !isExpired && "bg-brand-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {batch.productName}
                    </p>
                    <p className="font-mono text-[11px] text-brand-700 mt-0.5">
                      {batch.batchNumber}
                      {productCode ? ` · ${productCode}` : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Exp {batch.expiryDate} · Mfg {batch.mfgDate}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold tabular-nums">{batch.availableQty}</p>
                    <p className="text-[10px] text-muted-foreground">avail.</p>
                    {isAlreadyAdded ? (
                      <p className="text-[10px] text-brand-600 font-semibold bg-brand-50 px-1 py-0.5 rounded mt-0.5">Added</p>
                    ) : batch.status === "Near Expiry" && (
                      <p className="text-[10px] text-amber-700 flex items-center gap-0.5 justify-end mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> Near Expiry
                      </p>
                    )}
                    {isExpired && <p className="text-[10px] text-red-600 mt-0.5">Expired</p>}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </PopoverContent>
    </Popover>
  );
}
