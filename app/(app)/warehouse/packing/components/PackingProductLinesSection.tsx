"use client";

import React, { useMemo, useState } from "react";
import { Package, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalesOrderProduct, SalesOrderRecord } from "../types";
import { getPackingQtyLabel, isPurchaseReturnDoc } from "../lib/packing-document-labels";

interface PackingProductLinesSectionProps {
  order: SalesOrderRecord;
  selectedLines: Record<string, boolean>;
  packingQty: Record<string, number>;
  validationErrors: Record<string, string>;
  onToggleProduct: (key: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onQtyChange: (key: string, value: string, pending_cases: number) => void;
}

function getLineKey(p: SalesOrderProduct): string {
  return p.lineId || p.sku;
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
  
  const allSelected =
    order.products.length > 0 &&
    order.products.filter((p) => selectedLines[getLineKey(p)]).length === order.products.length;

  const orderedQtyLabel = getPackingQtyLabel(order.sourceDocumentType);
  const isPurchaseReturn = isPurchaseReturnDoc(order);

  // Group products by SKU
  const groupedProducts = useMemo(() => {
    const groups: Record<string, SalesOrderProduct[]> = {};
    order.products.forEach((p) => {
      if (!groups[p.sku]) groups[p.sku] = [];
      groups[p.sku].push(p);
    });
    return Object.values(groups);
  }, [order.products]);

  return (
    <div className="border-t border-border/80 pt-6 mt-6 space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-4 h-4 text-brand-600" />
          {isPurchaseReturn ? "Return Lines" : "Allocated Packing Lines"}
        </h2>
      </div>

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
            key={group[0].sku}
            products={group}
            orderedQtyLabel={orderedQtyLabel}
            selectedLines={selectedLines}
            packingQty={packingQty}
            validationErrors={validationErrors}
            onToggleProduct={onToggleProduct}
            onQtyChange={onQtyChange}
          />
        ))}
      </div>
    </div>
  );
}

interface PackingProductGroupProps {
  products: SalesOrderProduct[];
  orderedQtyLabel: string;
  selectedLines: Record<string, boolean>;
  packingQty: Record<string, number>;
  validationErrors: Record<string, string>;
  onToggleProduct: (key: string, checked: boolean) => void;
  onQtyChange: (key: string, value: string, pending_cases: number) => void;
}

function PackingProductGroup({
  products,
  orderedQtyLabel,
  selectedLines,
  packingQty,
  validationErrors,
  onToggleProduct,
  onQtyChange,
}: PackingProductGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const product = products[0];
  const totalOrderedQty = products.reduce((sum, p) => sum + (p.ordered_cases || 0), 0);
  const totalPendingQty = products.reduce((sum, p) => sum + (p.pending_cases || 0), 0);

  const allGroupSelected = products.every((p) => selectedLines[getLineKey(p)]);
  const someGroupSelected = products.some((p) => selectedLines[getLineKey(p)]);

  const handleGroupToggle = (checked: boolean) => {
    products.forEach((p) => {
      onToggleProduct(getLineKey(p), checked);
    });
  };

  return (
    <div className="flex flex-col">
      {/* Product Header */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors border-b border-border/40">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md hover:bg-muted text-foreground transition-colors"
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

        <div className="flex-1 min-w-[200px]">
          <p className="text-sm font-bold text-foreground">{product.product}</p>
          <p className="font-mono text-xs text-brand-700 font-semibold">{product.sku}</p>
        </div>

        <div className="flex flex-col gap-1 min-w-[120px]">
          <span className="text-xs">
            <span className="text-muted-foreground">Total {orderedQtyLabel}: </span>
            <span className="font-semibold text-foreground">{totalOrderedQty}</span>
          </span>
          <span className="text-xs">
            <span className="text-muted-foreground">Total Pending: </span>
            <span className="font-bold text-amber-600">{totalPendingQty}</span>
          </span>
        </div>
      </div>

      {/* Batch Rows */}
      {isExpanded && (
        <div className="flex flex-col divide-y divide-border/30 bg-white">
          {products.map((p) => {
            const lineKey = getLineKey(p);
            const isSelected = !!selectedLines[lineKey];
            const qtyValue = packingQty[lineKey] ?? 0;
            const error = validationErrors[lineKey];

            return (
              <div
                key={lineKey}
                className={cn(
                  "flex flex-wrap items-center gap-x-3 gap-y-2 pl-14 pr-4 py-2.5 hover:bg-muted/5 transition-colors",
                  !isSelected && "opacity-70"
                )}
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded accent-brand-600 flex-shrink-0"
                  checked={isSelected}
                  onChange={(e) => onToggleProduct(lineKey, e.target.checked)}
                  aria-label={`Select batch ${p.batchNumber} for ${p.product}`}
                />

                <div className="flex-1 min-w-[150px]">
                  {(p.batchNumber || p.grnNo) ? (
                    <div className="flex items-center gap-2">
                      {p.batchNumber && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          Batch: {p.batchNumber}
                        </span>
                      )}
                      {p.grnNo && (
                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                          GRN: {p.grnNo}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No batch specified</span>
                  )}
                </div>

                <div className="flex items-center gap-4 min-w-[120px]">
                  <span className="text-xs">
                    <span className="text-muted-foreground">Pending: </span>
                    <span className="font-bold text-amber-600">{p.pending_cases}</span>
                  </span>
                </div>

                <div className="w-[140px] flex-shrink-0 text-right pr-2">
                  {isSelected ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Pack:</span>
                        <Input
                          type="number"
                          min={0}
                          value={qtyValue || ""}
                          onChange={(e) => onQtyChange(lineKey, e.target.value, p.pending_cases)}
                          className={cn(
                            "w-20 h-8 text-right font-bold text-sm",
                            error ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                      </div>
                      {error && (
                        <span className="text-[10px] text-red-500 leading-tight text-right w-full">{error}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-medium text-muted-foreground italic">Not Selected</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
