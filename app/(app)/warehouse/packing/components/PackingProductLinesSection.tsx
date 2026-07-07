"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalesOrderProduct, SalesOrderRecord } from "../types";
import { PackingBatchSelectionTable } from "./PackingBatchSelectionTable";
import { PurchaseReturnBatchDetailsTable } from "./PurchaseReturnBatchDetailsTable";
import { getPackingQtyLabel, isPurchaseReturnDoc } from "../lib/packing-document-labels";

interface PackingProductLinesSectionProps {
  order: SalesOrderRecord;
  warehouseName: string;
  selectedSkus: Record<string, boolean>;
  packingQty: Record<string, number>;
  batchSelections: Record<string, Record<string, number>>;
  validationErrors: Record<string, string>;
  availableStock: Record<string, number>;
  onToggleProduct: (sku: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onQtyChange: (
    sku: string,
    value: string,
    pendingQty: number,
    maxAvailable: number,
  ) => void;
  onBatchSelectionsChange: (sku: string, selections: Record<string, number>) => void;
}

export function PackingProductLinesSection({
  order,
  warehouseName,
  selectedSkus,
  packingQty,
  batchSelections,
  validationErrors,
  availableStock,
  onToggleProduct,
  onToggleAll,
  onQtyChange,
  onBatchSelectionsChange,
}: PackingProductLinesSectionProps) {
  const [expandedSkus, setExpandedSkus] = useState<Record<string, boolean>>({});

  const allSelected =
    order.products.length > 0 &&
    order.products.filter((p) => selectedSkus[p.sku]).length === order.products.length;

  const orderedQtyLabel = getPackingQtyLabel(order.sourceDocumentType);
  const isPurchaseReturn = isPurchaseReturnDoc(order);

  useEffect(() => {
    if (!isPurchaseReturn) return;
    setExpandedSkus((prev) => {
      const next = { ...prev };
      order.products.forEach((p) => {
        if (selectedSkus[p.sku] && (packingQty[p.sku] ?? 0) > 0) {
          next[p.sku] = true;
        }
      });
      return next;
    });
  }, [isPurchaseReturn, order.products, selectedSkus, packingQty]);

  const toggleExpanded = (sku: string) => {
    setExpandedSkus((prev) => ({ ...prev, [sku]: !prev[sku] }));
  };

  return (
    <div className="border-t border-border/80 pt-6 mt-6 space-y-3">
      <div className="flex items-center justify-between gap-3 border-b pb-2">
        <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Package className="w-4 h-4 text-brand-600" />
          {isPurchaseReturn ? "Return Lines & Batch Details" : "Order Products & Batch Allocation"}
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
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-border/60">
        {order.products.map((p) => (
          <PackingProductRow
            key={p.lineId ?? p.sku}
            product={p}
            isPurchaseReturn={isPurchaseReturn}
            orderedQtyLabel={orderedQtyLabel}
            warehouseName={warehouseName}
            isSelected={!!selectedSkus[p.sku]}
            isExpanded={!!expandedSkus[p.sku]}
            packingQtyValue={packingQty[p.sku] ?? 0}
            maxAvailable={availableStock[p.sku] ?? 0}
            batchSelections={batchSelections[p.sku] ?? {}}
            validationError={validationErrors[p.sku]}
            onToggleProduct={(checked) => onToggleProduct(p.sku, checked)}
            onToggleExpanded={() => toggleExpanded(p.sku)}
            onQtyChange={(value) =>
              onQtyChange(p.sku, value, p.pendingQty, availableStock[p.sku] ?? 0)
            }
            onBatchSelectionsChange={(selections) => onBatchSelectionsChange(p.sku, selections)}
          />
        ))}
      </div>
    </div>
  );
}

interface PackingProductRowProps {
  product: SalesOrderProduct;
  isPurchaseReturn: boolean;
  orderedQtyLabel: string;
  warehouseName: string;
  isSelected: boolean;
  isExpanded: boolean;
  packingQtyValue: number;
  maxAvailable: number;
  batchSelections: Record<string, number>;
  validationError?: string;
  onToggleProduct: (checked: boolean) => void;
  onToggleExpanded: () => void;
  onQtyChange: (value: string) => void;
  onBatchSelectionsChange: (selections: Record<string, number>) => void;
}

function PackingProductRow({
  product,
  isPurchaseReturn,
  orderedQtyLabel,
  warehouseName,
  isSelected,
  isExpanded,
  packingQtyValue,
  maxAvailable,
  batchSelections,
  validationError,
  onToggleProduct,
  onToggleExpanded,
  onQtyChange,
  onBatchSelectionsChange,
}: PackingProductRowProps) {
  const requiredQty = isSelected ? product.pendingQty : 0;
  const showBatchSection = isSelected && requiredQty > 0;
  const currentPackedQty = Object.values(batchSelections).reduce((a, b) => a + b, 0);

  return (
    <div className={cn(!isSelected && "opacity-70")}>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 bg-muted/10",
          isExpanded && showBatchSection && "border-b border-border/60",
        )}
      >
        <button
          type="button"
          onClick={onToggleExpanded}
          disabled={!showBatchSection}
          className={cn(
            "p-1 rounded-md transition-colors flex-shrink-0",
            showBatchSection
              ? "hover:bg-muted text-foreground"
              : "text-muted-foreground/30 cursor-not-allowed",
          )}
          aria-label={isExpanded ? "Collapse batches" : "Expand batches"}
          aria-expanded={isExpanded}
        >
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform",
              isExpanded && showBatchSection && "rotate-180",
            )}
          />
        </button>

        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-brand-600 flex-shrink-0"
          checked={isSelected}
          onChange={(e) => onToggleProduct(e.target.checked)}
          aria-label={`Select ${product.product}`}
        />

        <div className="flex-1 min-w-[140px]">
          <p className="text-xs font-bold text-foreground">{product.product}</p>
          <p className="font-mono text-[11px] text-brand-700 font-semibold">{product.sku}</p>
          {(product.batchNumber || product.grnNo) && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {product.batchNumber && (
                <span className="font-mono">Batch: {product.batchNumber}</span>
              )}
              {product.batchNumber && product.grnNo && " · "}
              {product.grnNo && <span className="font-mono">GRN: {product.grnNo}</span>}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span>
            <span className="text-muted-foreground">{orderedQtyLabel}: </span>
            <span className="font-semibold text-foreground">{product.orderedQty}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Pending: </span>
            <span className="font-bold text-amber-600">{product.pendingQty}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Stock: </span>
            <span className="font-bold text-emerald-600">{maxAvailable}</span>
          </span>
        </div>

        <div className="w-[120px] flex-shrink-0 text-right pr-2">
          {isSelected ? (
            <div className="flex flex-col items-end">
              <span className="text-xs font-bold text-brand-700">
                Packing: {currentPackedQty}
              </span>
              {validationError && (
                <span className="text-[10px] text-red-500">{validationError}</span>
              )}
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">Not Selected</span>
          )}
        </div>
      </div>

      {isExpanded && showBatchSection && (
        <div className="px-3 py-3 bg-white">
          {isPurchaseReturn ? (
            <PurchaseReturnBatchDetailsTable
              product={product}
              requiredQty={requiredQty}
              selections={batchSelections}
              onSelectionsChange={onBatchSelectionsChange}
            />
          ) : (
            <PackingBatchSelectionTable
              productName={product.product}
              sku={product.sku}
              warehouse={warehouseName}
              requiredQty={requiredQty}
              selections={batchSelections}
              onSelectionsChange={onBatchSelectionsChange}
              allocatedQty={product.orderedQty}
              pendingQty={product.pendingQty}
            />
          )}
        </div>
      )}
    </div>
  );
}
