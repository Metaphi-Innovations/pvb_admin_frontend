"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  getAvailableBatchRowsForTransfer,
  type TransferLineItem,
} from "../stock-transfer-data";

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
}

export default function TransferProductLinesEditor({
  lines,
  products,
  sourceWarehouseId,
  targetWarehouseId,
  onChange,
  error,
}: TransferProductLinesEditorProps) {
  const sourceWarehouseName = useMemo(() => {
    if (!sourceWarehouseId) return "";
    return loadWarehouses().find((w) => w.id === sourceWarehouseId)?.warehouseName ?? "";
  }, [sourceWarehouseId]);

  const taxSupplyType: TaxSupplyType = useMemo(() => {
    const source = loadWarehouses().find((w) => w.id === sourceWarehouseId);
    const target = loadWarehouses().find((w) => w.id === targetWarehouseId);
    if (!source || !target) return "intra";
    return source.state === target.state ? "intra" : "inter";
  }, [sourceWarehouseId, targetWarehouseId]);

  const removeLine = (id: string) => {
    onChange(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, patch: Partial<TransferLineItem>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        const product = products.find((p) => p.id === (patch.productId ?? line.productId));
        let next: TransferLineItem = { ...line, ...patch };

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
  const [localError, setLocalError] = useState<string | null>(null);

  const topBatches = useMemo(() => {
    if (!sourceWarehouseName || !topSelectedProduct) return [];
    return getAvailableBatchRowsForTransfer(
      sourceWarehouseName,
      topSelectedProduct.name,
      topSelectedProduct.code
    );
  }, [sourceWarehouseName, topSelectedProduct]);

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
    const qty = parseInt(topInputQty, 10) || 0;
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
    newLine.mfgDate = topSelectedBatch.mfgDate;
    newLine.expiryDate = topSelectedBatch.expiryDate;
    newLine.availableStock = topSelectedBatch.availableQty;
    newLine.dealerPrice = topSelectedProduct.sellingPrice;
    newLine.unitPrice = topSelectedProduct.sellingPrice;
    newLine.finalRate = topSelectedProduct.sellingPrice;
    newLine.gstRate = topSelectedProduct.gstRate;
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
    setTopInputQty("1");
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
              const batches = sourceWarehouseName
                ? getAvailableBatchRowsForTransfer(sourceWarehouseName, p.name, p.code)
                : [];
              if (batches.length > 0) {
                setTopSelectedBatch(batches[0]);
              } else {
                setTopSelectedBatch(null);
              }
            }}
          />
        }
        customBatchSelectorArea={
          <BatchSelect
            productName={topSelectedProduct ? topSelectedProduct.name : ""}
            productCode={topSelectedProduct ? topSelectedProduct.code : ""}
            batches={topBatches}
            value={topSelectedBatch ? topSelectedBatch.batchNumber : undefined}
            disabled={!topSelectedProduct || !sourceWarehouseName}
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
        customTableHead={
          <>
            <tr className="bg-muted/40 border-b border-border">
              {[
                { h: "Product", rowSpan: 2 },
                { h: "SKU", rowSpan: 2 },
                { h: "Batch No.", rowSpan: 2 },
                { h: "Expiry", rowSpan: 2 },
                { h: "Available", rowSpan: 2 },
                { h: "Transfer Qty", rowSpan: 2 },
                { h: "CP", rowSpan: 2 },
              ].map(({ h, rowSpan }) => (
                <th
                  key={h}
                  rowSpan={rowSpan}
                  className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap align-middle"
                >
                  {h}
                </th>
              ))}
              <th
                colSpan={taxSupplyType === "intra" ? 4 : 2}
                className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-foreground border-b border-border/60"
              >
                {taxSupplyType === "intra" ? "Tax — CGST + SGST" : "Tax — IGST"}
              </th>
              {[
                { h: "Total", rowSpan: 2 },
                { h: "", rowSpan: 2 },
              ].map(({ h, rowSpan }) => (
                <th
                  key={h || "actions"}
                  rowSpan={rowSpan}
                  className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground align-middle"
                >
                  {h}
                </th>
              ))}
            </tr>
            <tr className="bg-muted/40 border-b border-border">
              {(taxSupplyType === "intra"
                ? ["CGST %", "CGST Amt", "SGST %", "SGST Amt"]
                : ["IGST %", "IGST Amt"]
              ).map((h) => (
                <th key={h} className={TAX_HEAD}>
                  {h}
                </th>
              ))}
            </tr>
          </>
        }
        customTableBody={
          lines.map((line) => {
            const batches = sourceWarehouseName
              ? getAvailableBatchRowsForTransfer(
                  sourceWarehouseName,
                  line.productName,
                  line.productCode,
                )
              : [];
            const product = products.find((p) => p.id === line.productId);
            const selectedBatch = batches.find((b) => b.batchNumber === line.batchNumber);
            const isNearExpiry = selectedBatch?.status === "Near Expiry";
            const isExpired = selectedBatch?.status === "Expired";
            const taxBreakdown =
              line.productId && product?.gstRate
                ? computeLineTaxBreakdown(line, product.gstRate, taxSupplyType)
                : null;

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
                        expiryDate: undefined,
                        mfgDate: undefined,
                      });
                    }}
                  />
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
                    disabled={!line.productId || !sourceWarehouseName}
                    alreadyAddedBatchNumbers={lines
                      .filter((l) => l.id !== line.id && l.productId === line.productId)
                      .map((l) => l.batchNumber)
                      .filter((bn): bn is string => typeof bn === "string")}
                    onSelect={(batch) => {
                      updateLine(line.id, {
                        batchNumber: batch.batchNumber,
                        mfgDate: batch.mfgDate,
                        expiryDate: batch.expiryDate,
                        availableStock: batch.availableQty,
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
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    min={0}
                    max={line.availableStock ?? 0}
                    disabled={!line.batchNumber || isExpired}
                    value={line.quantity || ""}
                    onChange={(e) =>
                      updateLine(line.id, { quantity: parseInt(e.target.value, 10) || 0 })
                    }
                    className="h-8 w-24 text-xs text-right bg-white"
                  />
                </td>
                <td className="px-3 py-2 text-xs tabular-nums whitespace-nowrap">
                  {line.productId ? formatRupee(line.unitPrice ?? 0) : "—"}
                </td>
                {line.productId && product && taxBreakdown ? (
                  taxSupplyType === "intra" ? (
                    <>
                      <td className={cn(TAX_CELL, "text-muted-foreground")}>
                        {taxBreakdown.cgstRate}%
                      </td>
                      <td className={TAX_CELL_AMT}>{formatRupee(line.cgstAmount ?? 0)}</td>
                      <td className={cn(TAX_CELL, "text-muted-foreground")}>
                        {taxBreakdown.sgstRate}%
                      </td>
                      <td className={TAX_CELL_AMT}>{formatRupee(line.sgstAmount ?? 0)}</td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TAX_CELL, "text-muted-foreground")}>
                        {taxBreakdown.igstRate}%
                      </td>
                      <td className={TAX_CELL_AMT}>{formatRupee(line.igstAmount ?? 0)}</td>
                    </>
                  )
                ) : (
                  Array.from({ length: taxSupplyType === "intra" ? 4 : 2 }).map((_, i) => (
                    <td key={i} className={TAX_CELL}>
                      —
                    </td>
                  ))
                )}
                <td className="px-3 py-2 text-xs font-semibold tabular-nums whitespace-nowrap">
                  {line.productId ? formatRupee(line.lineTotal ?? 0) : "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => removeLine(line.id)}
                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
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
                Total quantity:{" "}
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
  batches: ReturnType<typeof getAvailableBatchRowsForTransfer>;
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
          batches.map((batch) => {
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
