"use client";

import React, { useMemo, useState } from "react";
import { Package, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalesOrderProduct, SalesOrderRecord } from "../types";
import { getPackingQtyLabel, isPurchaseReturnDoc } from "../lib/packing-document-labels";
import { getProductPackingConfig } from "@/app/(app)/sales/orders/packing-list-data";

interface PackingProductLinesSectionProps {
  order: SalesOrderRecord;
  selectedLines: Record<string, boolean>;
  packingQty: Record<string, number>;
  validationErrors: Record<string, string>;
  onToggleProduct: (key: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onQtyChange: (key: string, value: number, maxBaseQty: number) => void;
}

function getLineKey(p: SalesOrderProduct): string {
  return p.lineId || p.sku;
}

function isPackableLine(p: SalesOrderProduct): boolean {
  return Number(p.pendingBaseQty) > 0;
}

export function PackingProductLinesSection({
  order,
  selectedLines,
  packingQty,
  validationErrors,
  onToggleProduct,
  onToggleAll,
  onQtyChange,
}: PackingProductLinesSectionProps) {
  const packableProducts = useMemo(
    () => order.products.filter(isPackableLine),
    [order.products],
  );

  const allSelected =
    packableProducts.length > 0 &&
    packableProducts.every((p) => selectedLines[getLineKey(p)]);

  const orderedQtyLabel = getPackingQtyLabel(order.sourceDocumentType);
  const isPurchaseReturn = isPurchaseReturnDoc(order);

  // Group products by SKU; keep full group for Ordered totals, show only pending lines
  const groupedProducts = useMemo(() => {
    const groups: Record<string, SalesOrderProduct[]> = {};
    order.products.forEach((p) => {
      const groupKey = `${p.sku}-${p.quantity_type || "Case"}`;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(p);
    });
    return Object.values(groups)
      .map((all) => ({
        all,
        packable: all.filter(isPackableLine),
      }))
      .filter((group) => group.packable.length > 0);
  }, [order.products]);

  return (
    <div className="border-t border-border/80 pt-6 mt-6 space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-4 h-4 text-brand-600" />
          {isPurchaseReturn ? "Return Lines" : "Allocated Packing Lines"}
        </h2>
      </div>

      {packableProducts.length === 0 ? (
        <p className="text-xs text-muted-foreground px-1 py-4">
          No pending batch lines left to pack.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-2 px-1 pb-1">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-brand-600"
              checked={allSelected}
              onChange={(e) => onToggleAll(e.target.checked)}
              aria-label="Select all products"
            />
            <span className="text-xs font-semibold text-muted-foreground">Select All</span>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-border/60">
            {groupedProducts.map((group) => (
              <PackingProductGroup
                key={`${group.all[0].sku}-${group.all[0].quantity_type || "Case"}`}
                allProducts={group.all}
                packableProducts={group.packable}
                orderedQtyLabel={orderedQtyLabel}
                selectedLines={selectedLines}
                packingQty={packingQty}
                validationErrors={validationErrors}
                onToggleProduct={onToggleProduct}
                onQtyChange={onQtyChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface PackingProductGroupProps {
  allProducts: SalesOrderProduct[];
  packableProducts: SalesOrderProduct[];
  orderedQtyLabel: string;
  selectedLines: Record<string, boolean>;
  packingQty: Record<string, number>;
  validationErrors: Record<string, string>;
  onToggleProduct: (key: string, checked: boolean) => void;
  onQtyChange: (key: string, value: number, maxBaseQty: number) => void;
}

function PackingProductGroup({
  allProducts,
  packableProducts,
  orderedQtyLabel,
  selectedLines,
  packingQty,
  validationErrors,
  onToggleProduct,
  onQtyChange,
}: PackingProductGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const product = allProducts[0];
  const quantityType = product.quantity_type?.toLowerCase() || "case";
  const isPiece = quantityType === "piece" || quantityType === "pieces";

  const config = product.productId ? getProductPackingConfig(Number(product.productId)) : undefined;
  const unitsPerCase = isPiece ? 1 : product.packSize || 1;
  const displayLabel = isPiece ? "Pieces" : "Cases";

  // Ordered from full allocation; Pending only from still-packable lines
  const totalOrderedQty = allProducts.reduce((sum, p) => sum + (p.orderBaseQty || 0), 0);
  const totalPendingQty = packableProducts.reduce((sum, p) => sum + (p.pendingBaseQty || 0), 0);

  const allGroupSelected = packableProducts.every((p) => selectedLines[getLineKey(p)]);
  const someGroupSelected = packableProducts.some((p) => selectedLines[getLineKey(p)]);

  const handleGroupToggle = (checked: boolean) => {
    packableProducts.forEach((p) => {
      onToggleProduct(getLineKey(p), checked);
    });
  };

  return (
    <div className="flex flex-col">
      {/* Product Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 bg-white hover:bg-slate-50 transition-colors">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 -ml-1 rounded-md hover:bg-slate-100 text-slate-500 transition-colors"
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-brand-600 flex-shrink-0"
          checked={allGroupSelected}
          ref={(el) => {
            if (el) el.indeterminate = someGroupSelected && !allGroupSelected;
          }}
          onChange={(e) => handleGroupToggle(e.target.checked)}
          aria-label={`Select all batches for ${product.product}`}
        />

        <div className="flex-1 min-w-[200px] flex flex-col">
          <p className="text-[13px] font-bold text-slate-800">{product.product}</p>
          <p className="font-mono text-[10px] text-slate-500 font-medium tracking-wide">{product.sku}</p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="text-slate-500">
            {orderedQtyLabel}:{" "}
            <span className="font-bold text-slate-700">
              {isPiece ? totalOrderedQty : Math.floor(totalOrderedQty / unitsPerCase)} {displayLabel}
            </span>
          </div>
          <div className="h-3.5 w-[1px] bg-border/80" />
          <div className="text-slate-500">
            Pending:{" "}
            <span className="font-bold text-slate-700">
              {isPiece ? totalPendingQty : Math.floor(totalPendingQty / unitsPerCase)} {displayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Batch Rows Table — only pending lines */}
      {isExpanded && (
        <div className="bg-white border-t border-border/40 overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-border/40 bg-white">
                <th className="py-2.5 px-4 text-[11px] font-bold text-foreground w-12">Select</th>
                <th className="py-2.5 px-2 text-[11px] font-bold text-foreground w-[120px]">Quantity Type</th>
                <th className="py-2.5 px-2 text-[11px] font-bold text-foreground">Batch</th>
                <th className="py-2.5 px-2 text-[11px] font-bold text-foreground w-[100px]">Pending Qty</th>
                <th className="py-2.5 px-2 text-[11px] font-bold text-foreground w-[120px]">Pack Qty</th>
                <th className="py-2.5 px-4 text-[11px] font-bold text-foreground w-[100px] text-right">Total (Base)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {packableProducts.map((p) => {
                const lineKey = getLineKey(p);
                const isSelected = !!selectedLines[lineKey];
                const qtyValue = packingQty[lineKey] ?? 0;
                const error = validationErrors[lineKey];

                const qtyType = (p.quantity_type || "case").toUpperCase();
                const isPieceRow = qtyType === "PIECE" || qtyType === "PIECES";
                const rowUnitsPerCase = isPieceRow ? 1 : p.packSize || 1;

                const packQtyDisplay = isPieceRow ? qtyValue : Math.floor(qtyValue / rowUnitsPerCase);
                const pendingQtyDisplay = isPieceRow
                  ? p.pendingBaseQty
                  : Math.floor(p.pendingBaseQty / rowUnitsPerCase);

                return (
                  <tr
                    key={lineKey}
                    className={cn(
                      "hover:bg-muted/5 transition-colors",
                      !isSelected && "opacity-60",
                    )}
                  >
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-600"
                        checked={isSelected}
                        onChange={(e) => onToggleProduct(lineKey, e.target.checked)}
                        aria-label={`Select batch ${p.batchNumber} for ${p.product}`}
                      />
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-orange-700 tracking-wide">
                        {qtyType}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col gap-0.5">
                        {p.batchNumber ? (
                          <span className="font-mono text-xs font-semibold text-orange-600/90">
                            {p.batchNumber}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                        {p.grnNo && (
                          <span className="font-mono text-[10px] text-purple-600/80">
                            GRN: {p.grnNo}
                          </span>
                        )}
                        {(p.mfgDate || p.expDate) && (
                          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                            {p.mfgDate && (
                              <span>Mfg: {new Date(p.mfgDate).toLocaleDateString()}</span>
                            )}
                            {p.expDate && (
                              <span>Exp: {new Date(p.expDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-xs font-medium text-slate-600">{pendingQtyDisplay}</span>
                    </td>
                    <td className="py-3 px-2">
                      {isSelected ? (
                        <div className="flex flex-col gap-1 w-20">
                          <Input
                            type="number"
                            min={0}
                            value={packQtyDisplay || ""}
                            onChange={(e) => {
                              const enteredQty =
                                e.target.value === "" ? 0 : Number(e.target.value);
                              const newBaseQty = isPieceRow
                                ? enteredQty
                                : enteredQty * rowUnitsPerCase;
                              onQtyChange(lineKey, newBaseQty, p.pendingBaseQty);
                            }}
                            className={cn(
                              "h-8 text-xs font-medium shadow-none border-border/80 focus-visible:ring-brand-500",
                              error ? "border-red-500 focus-visible:ring-red-500" : "",
                            )}
                            placeholder="0"
                          />
                          {error && (
                            <span className="text-[9px] text-red-500 leading-tight absolute mt-9 w-24">
                              {error}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isSelected ? (
                        <span className="text-xs font-bold text-slate-700">{qtyValue}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
