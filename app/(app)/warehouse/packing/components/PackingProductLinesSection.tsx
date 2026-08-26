"use client";

import React, { useMemo, useState } from "react";
import { Package, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SalesOrderProduct, SalesOrderRecord } from "../types";
import { getPackingQtyLabel, isPurchaseReturnDoc } from "../lib/packing-document-labels";
import { isPackingPieceQty, toQtyStackMeta } from "../lib/packing-qty-stack";
import {
  StackedQtyDisplay,
  StackedQtyHeaderPair,
} from "@/app/(app)/sales/shared/StackedQtyDisplay";

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

function formatDateShort(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
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

          <div className="space-y-3">
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
  const qtyMeta = toQtyStackMeta(product);

  const totalOrderedQty = allProducts.reduce((sum, p) => sum + (p.orderBaseQty || 0), 0);
  const totalPackedQty = allProducts.reduce((sum, p) => sum + (p.packedBaseQty || 0), 0);
  const totalPendingQty = packableProducts.reduce((sum, p) => sum + (p.pendingBaseQty || 0), 0);
  const thisPackQty = packableProducts.reduce((sum, p) => {
    const key = getLineKey(p);
    if (!selectedLines[key]) return sum;
    return sum + (packingQty[key] ?? 0);
  }, 0);

  const selectedCount = packableProducts.filter((p) => selectedLines[getLineKey(p)]).length;
  const allGroupSelected = packableProducts.every((p) => selectedLines[getLineKey(p)]);
  const someGroupSelected = packableProducts.some((p) => selectedLines[getLineKey(p)]);
  const insufficient = thisPackQty <= 0 && totalPendingQty > 0;

  const handleGroupToggle = (checked: boolean) => {
    packableProducts.forEach((p) => {
      onToggleProduct(getLineKey(p), checked);
    });
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="w-full px-4 py-3 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-brand-600 flex-shrink-0 mt-0.5"
              checked={allGroupSelected}
              ref={(el) => {
                if (el) el.indeterminate = someGroupSelected && !allGroupSelected;
              }}
              onChange={(e) => handleGroupToggle(e.target.checked)}
              aria-label={`Select all batches for ${product.product}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{product.product}</p>
              <p className="text-xs text-muted-foreground font-mono">
                SKU: {product.sku?.trim() || "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {orderedQtyLabel.replace(/ Qty$/i, "")} {totalOrderedQty}
                {" · "}Packed {totalPackedQty}
                {" · "}Pending {totalPendingQty}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <StackedQtyHeaderPair
              orderedBaseQty={totalPendingQty}
              allocatedBaseQty={thisPackQty}
              meta={qtyMeta}
              orderedLabel="Pending"
              allocatedLabel="This Pack"
              insufficient={insufficient}
              showPackSize={false}
            />
            {!isExpanded && selectedCount > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                ({selectedCount} batch{selectedCount !== 1 ? "es" : ""} selected)
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto bg-white">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-muted/10 border-b border-border">
                <th className="px-4 py-2.5 text-left w-12 text-xs font-semibold">Select</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Quantity Type</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold">Batch</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold min-w-[100px]">
                  Available Qty
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold w-32">Pack Qty</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold min-w-[100px]">Total</th>
              </tr>
            </thead>
            <tbody>
              {packableProducts.map((p) => {
                const lineKey = getLineKey(p);
                const isSelected = !!selectedLines[lineKey];
                const qtyValue = packingQty[lineKey] ?? 0;
                const error = validationErrors[lineKey];
                const qtyType = (p.quantity_type || "case").toUpperCase();
                const isPieceRow = isPackingPieceQty(p.quantity_type);
                const rowUnitsPerCase = isPieceRow ? 1 : p.packSize || 1;
                const packQtyDisplay = isPieceRow
                  ? qtyValue
                  : Math.floor(qtyValue / rowUnitsPerCase);
                const lineMeta = toQtyStackMeta(p);

                return (
                  <tr
                    key={lineKey}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      isSelected && "bg-brand-50/30",
                    )}
                  >
                    <td className="px-4 py-2.5 align-top">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600"
                        checked={isSelected}
                        onChange={(e) => onToggleProduct(lineKey, e.target.checked)}
                        aria-label={`Select batch ${p.batchNumber} for ${p.product}`}
                      />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
                          isPieceRow
                            ? "bg-slate-100 text-slate-700"
                            : "bg-orange-100 text-orange-700",
                        )}
                      >
                        {qtyType}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-mono text-brand-700 font-semibold">
                          {p.batchNumber?.trim() || "—"}
                        </span>
                        {p.grnNo ? (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            GRN: {p.grnNo}
                          </span>
                        ) : null}
                        <span className="text-[10px] text-muted-foreground">
                          Mfg: {formatDateShort(p.mfgDate)} · Exp: {formatDateShort(p.expDate)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <StackedQtyDisplay baseQty={p.pendingBaseQty} meta={lineMeta} />
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {isSelected ? (
                        <div className="flex flex-col gap-1 items-stretch w-full max-w-[7rem]">
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
                              "h-7 text-xs px-2 w-full bg-white",
                              error && "border-red-500 focus-visible:ring-red-500",
                            )}
                            placeholder="0"
                          />
                          <span className="text-[10px] text-muted-foreground">
                            {isPieceRow ? "Unit" : "Case"}
                          </span>
                          {error ? (
                            <span className="text-[9px] text-red-500 leading-tight">{error}</span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <StackedQtyDisplay
                        baseQty={isSelected ? qtyValue : 0}
                        meta={lineMeta}
                      />
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
