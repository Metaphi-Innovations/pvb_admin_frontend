"use client";

import React, { useState } from "react";
import { Check, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/procurement/utils";
import {
  calcPackingToBaseQty,
  calcPrLineAmount,
  enrichProductForProcurement,
  type PackagingUom,
} from "@/lib/procurement/procurement-line-utils";
import type { PRLineItem } from "@/app/(app)/procurement/purchase-requests/pr-data";

interface InlineEditDraft {
  productId: string;
  packingQty: string;
  remarks: string;
}

interface ProductItemDetailsSectionProps {
  mode?: "purchase_request" | "sales_return" | "sales-order" | "sales-order-grid" | "stock-transfer";
  products?: { value: string; label: string }[];
  selectedProductId?: string[];
  quantity?: string;
  remarks?: string;
  items: any[];
  onProductChange?: (val: string[]) => void;
  onQuantityChange?: (val: string) => void;
  onRemarksChange?: (val: string) => void;
  onAddItem?: (productIds: string[], qty: number, remarks: string) => void;
  onRemoveItem?: (uid: string) => void;
  onUpdateItem?: (uid: string, patch: any) => void;
  disabled?: boolean;
  readOnly?: boolean;
  hideQuickAdd?: boolean;
  noBorder?: boolean;
  title?: string;
  description?: string;
  addButtonLabel?: string;
  showCasePieceBreakdown?: boolean;
  piecesPerCase?: number;
  quantityLabel?: string;
  quantityUnitLabel?: string;
  packedQtyUnitLabel?: string;
  dispatchQtyUnitLabel?: string;
  validateQuantityAsPieces?: boolean;

  // Custom slots and overrides
  customSelectorArea?: React.ReactNode;
  customBatchSelectorArea?: React.ReactNode;
  customTableHead?: React.ReactNode;
  customTableBody?: React.ReactNode;
  customTableFooter?: React.ReactNode;
  headerAction?: React.ReactNode;
  totalQuantity?: number;
  totalAmount?: number;
  showTotalsInHeader?: boolean;
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-3 pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function packagingUnitToRequestUom(packagingUnit: string): PackagingUom {
  const norm = packagingUnit.toLowerCase();
  if (norm.includes("case")) return "Case";
  if (norm.includes("box")) return "Box";
  if (norm.includes("carton")) return "Carton";
  return "Unit";
}

const inputCls = "h-8 rounded-lg text-xs";

export function ProductItemDetailsSection({
  mode = "purchase_request",
  products = [],
  selectedProductId,
  quantity,
  remarks,
  items,
  onProductChange,
  onQuantityChange,
  onRemarksChange,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  disabled = false,
  readOnly = false,
  hideQuickAdd = false,
  noBorder = false,
  title = "Product / Item Details",
  description = "Enter packaging quantity — total SKU qty and amount are auto-calculated from product master.",
  addButtonLabel = "Add Item",
  showCasePieceBreakdown,
  piecesPerCase = 10,
  quantityLabel = "Quantity",
  quantityUnitLabel,
  packedQtyUnitLabel,
  dispatchQtyUnitLabel,
  validateQuantityAsPieces = false,
  customSelectorArea,
  customBatchSelectorArea,
  customTableHead,
  customTableBody,
  customTableFooter,
  headerAction,
  totalQuantity,
  totalAmount,
  showTotalsInHeader = false,
}: ProductItemDetailsSectionProps) {
  const shouldShowBreakdown = showCasePieceBreakdown !== undefined ? showCasePieceBreakdown : (mode === "sales_return");
  const [localQuickProductIds, setLocalQuickProductIds] = useState<string[]>([]);
  const [localQuickQty, setLocalQuickQty] = useState("1");
  const [localQuickRemarks, setLocalQuickRemarks] = useState("");

  const quickProductIds = selectedProductId !== undefined ? selectedProductId : localQuickProductIds;
  const quickQty = quantity !== undefined ? quantity : localQuickQty;
  const quickRemarks = remarks !== undefined ? remarks : localQuickRemarks;

  const setQuickProductIds = (val: string[]) => {
    if (onProductChange) onProductChange(val);
    else setLocalQuickProductIds(val);
  };

  const setQuickQty = (val: string) => {
    if (onQuantityChange) onQuantityChange(val);
    else setLocalQuickQty(val);
  };

  const setQuickRemarks = (val: string) => {
    if (onRemarksChange) onRemarksChange(val);
    else setLocalQuickRemarks(val);
  };

  const [inlineEditUid, setInlineEditUid] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<InlineEditDraft | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);

  const filledLines = items;
  const totalPackingQty = (mode === "sales-order" || mode === "sales-order-grid" || mode === "stock-transfer")
    ? (totalQuantity !== undefined ? totalQuantity : 0)
    : items.reduce((sum, l) => sum + (l.requestedQty || 0), 0);
  const totalSkuQty = items.reduce((sum, l) => sum + (l.totalQtyBase || 0), 0);
  const totalAmountVal = (mode === "sales-order" || mode === "sales-order-grid" || mode === "stock-transfer")
    ? (totalAmount !== undefined ? totalAmount : 0)
    : mode === "purchase_request"
      ? items.reduce((sum, l) => sum + calcPrLineAmount(l.ratePerSku, l.totalQtyBase), 0)
      : items.reduce((sum, l) => sum + ((l.requestedQty || 0) * (l.ratePerSku || 0)), 0);

  const previewProductId = Number(quickProductIds[0]);
  const previewProductInfo = previewProductId ? enrichProductForProcurement(previewProductId) : null;
  const previewSkuQty = previewProductInfo
    ? calcPackingToBaseQty(Number(quickQty) || 0, previewProductInfo.conversionQty)
    : 0;
  const previewAmount = previewProductInfo
    ? calcPrLineAmount(previewProductInfo.ratePerSku, previewSkuQty)
    : 0;

  const clearQuickFields = () => {
    setQuickProductIds([]);
    setQuickQty("1");
    setQuickRemarks("");
  };

  const cancelInlineEdit = () => {
    setInlineEditUid(null);
    setInlineEditDraft(null);
    setInlineEditError(null);
  };

  const startInlineEdit = (line: PRLineItem) => {
    setInlineEditUid(line.uid);
    setInlineEditDraft({
      productId: String(line.productId),
      packingQty: String(line.requestedQty),
      remarks: line.remarks,
    });
    setInlineEditError(null);
  };

  const saveInlineEdit = () => {
    if (!inlineEditUid || !inlineEditDraft) return;
    const packingQty = Number(inlineEditDraft.packingQty);
    if (packingQty <= 0) {
      setInlineEditError("Packing qty must be greater than 0");
      return;
    }
    const productId = Number(inlineEditDraft.productId);
    if (!productId) {
      setInlineEditError("Product is required");
      return;
    }

    const info = enrichProductForProcurement(productId);
    if (!info) return;

    const requestUom = packagingUnitToRequestUom(info.packagingUnit);

    if (onUpdateItem) {
      onUpdateItem(inlineEditUid, {
        productId: info.productId,
        productCode: info.productCode,
        productName: info.productName,
        description: info.description,
        sku: info.sku,
        baseUnit: info.baseUnit,
        packagingUnit: info.packagingUnit,
        conversionQty: info.conversionQty,
        segment: info.segment,
        category: info.category,
        hsnCode: info.hsnCode,
        mrp: info.mrp,
        ratePerSku: info.ratePerSku,
        requestUom: requestUom,
        requestedQty: packingQty,
        remarks: inlineEditDraft.remarks,
      });
    }
    cancelInlineEdit();
  };

  const handleQuickAdd = () => {
    if (quickProductIds.length === 0) return;
    const packingQty = Number(quickQty) || 1;
    if (onAddItem) onAddItem(quickProductIds, packingQty, quickRemarks);
    clearQuickFields();
  };

  return (
    <div className={cn(!noBorder && "border-t border-border/60 pt-4")}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <SectionHead label={title} sub={description} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700">
            {filledLines.length} item{filledLines.length === 1 ? "" : "s"}
          </span>
          {(mode === "purchase_request" || showTotalsInHeader) && filledLines.length > 0 && (
            <>
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                {totalPackingQty} qty
              </span>
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                {formatCurrency(totalAmountVal)}
              </span>
            </>
          )}
          {headerAction}
        </div>
      </div>

      {mode === "stock-transfer" ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.5fr)_96px_auto]">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product</Label>
              {customSelectorArea}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Batch No.</Label>
              {customBatchSelectorArea}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Transfer Qty</Label>
              <Input
                type="number"
                min={1}
                value={quantity || ""}
                onChange={(e) => onQuantityChange && onQuantityChange(e.target.value)}
                className="h-8 rounded-lg text-xs bg-white border-border"
                disabled={disabled}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => onAddItem && onAddItem([], 0, "")}
                disabled={disabled}
                className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product
              </Button>
            </div>
          </div>
        </div>
      ) : mode === "sales-order" ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_96px_auto]">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product</Label>
              {customSelectorArea}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Qty</Label>
              <Input
                type="number"
                min={1}
                value={quantity || "1"}
                onChange={(e) => onQuantityChange && onQuantityChange(e.target.value)}
                className="h-8 rounded-lg text-xs bg-white border-border"
                disabled={disabled}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={() => onAddItem && onAddItem([], 0, "")}
                disabled={disabled}
                className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Product
              </Button>
            </div>
          </div>
        </div>
      ) : customSelectorArea ? customSelectorArea : (!readOnly && !hideQuickAdd && mode !== "sales-order-grid" && (
        <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product</Label>
              <AutocompleteSelect
                options={products}
                value={quickProductIds}
                onChange={(val) => setQuickProductIds(Array.isArray(val) ? val.map(String) : [])}
                multiple
                placeholder="Search or select products..."
                searchPlaceholder="Search product..."
                className="h-8 rounded-lg text-xs"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {mode === "purchase_request" ? "Quantity" : "Return Qty"}
              </Label>
              <Input
                type="number"
                min={1}
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                className={inputCls}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Input
                value={quickRemarks}
                onChange={(e) => setQuickRemarks(e.target.value)}
                placeholder="Optional"
                className={inputCls}
                disabled={disabled}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={handleQuickAdd}
                disabled={quickProductIds.length === 0 || !!inlineEditUid || disabled}
                className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> {addButtonLabel}
              </Button>
            </div>
          </div>
          {previewProductInfo && mode === "purchase_request" && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/60 bg-white px-3 py-2 text-[11px]">
              <span>
                <span className="text-muted-foreground">HSN: </span>
                <span className="font-mono font-medium text-foreground">{previewProductInfo.hsnCode || "—"}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Packaging: </span>
                <span className="font-medium text-foreground">{previewProductInfo.packagingUnit}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Conversion: </span>
                <span className="font-medium text-foreground">
                  1 {previewProductInfo.packagingUnit} = {previewProductInfo.conversionQty} SKU
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Total SKU Qty: </span>
                <span className="font-semibold text-brand-700 tabular-nums">{previewSkuQty}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Rate/SKU: </span>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(previewProductInfo.ratePerSku)}
                </span>
              </span>
              <span>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-semibold text-brand-700 tabular-nums">{formatCurrency(previewAmount)}</span>
              </span>
            </div>
          )}
        </div>
      ))}

      {filledLines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/70" />
          <p className="text-sm font-semibold text-foreground">
            {mode === "purchase_request" ? "No items added yet" : (mode === "sales-order" || mode === "stock-transfer") ? "No products added yet" : "No return products added yet"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "purchase_request"
              ? "Add a product to start building this request."
              : mode === "sales-order"
              ? "Select a product and click Add Product to add it to this order."
              : mode === "stock-transfer"
              ? "Select a product, batch, and transfer quantity to add it to this transfer."
              : "Add a product to start building this return."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className={cn("w-full", (mode === "sales-order" || mode === "stock-transfer") ? "min-w-[1180px]" : "min-w-[900px] table-fixed")}>
            <thead>
              {customTableHead ? customTableHead : (
                <tr className="border-b border-border bg-muted/40">
                  {mode === "purchase_request" ? (
                    <>
                      <th className="w-[22%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Product</th>
                      <th className="w-[10%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">HSN Code</th>
                      <th className="w-[12%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Packaging Type</th>
                      <th className="w-[10%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Quantity</th>
                      <th className="w-[12%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Total SKU Qty</th>
                      <th className="w-[12%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Rate / SKU</th>
                      <th className="w-[14%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Total Amount</th>
                      {!readOnly && <th className="w-16 px-4 py-2.5 text-right text-xs font-semibold text-foreground">Actions</th>}
                    </>
                  ) : (
                    <>
                      {shouldShowBreakdown ? (
                        <>
                          <th className="w-[24%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Product</th>
                          <th className="w-[10%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">SKU</th>
                          <th className="w-[9%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            Packed Qty{packedQtyUnitLabel && <span className="text-orange-500 font-medium ml-1">({packedQtyUnitLabel})</span>}
                          </th>
                          <th className="w-[9%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            Dispatch Qty{dispatchQtyUnitLabel && <span className="text-orange-500 font-medium ml-1">({dispatchQtyUnitLabel})</span>}
                          </th>
                          <th className="w-[10%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            {quantityLabel}{quantityUnitLabel && <span className="text-orange-500 font-medium ml-1">({quantityUnitLabel})</span>}
                          </th>
                          <th className="w-[13%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Case / Piece</th>
                          <th className="w-[13%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Remarks</th>
                          <th className="w-[12%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Amount</th>
                          {!readOnly && <th className="w-12 px-4 py-2.5 text-right text-xs font-semibold text-foreground">Actions</th>}
                        </>
                      ) : (
                        <>
                          <th className="w-[28%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Product</th>
                          <th className="w-[12%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">SKU</th>
                          <th className="w-[10%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            Packed Qty{packedQtyUnitLabel && <span className="text-orange-500 font-medium ml-1">({packedQtyUnitLabel})</span>}
                          </th>
                          <th className="w-[10%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            Dispatch Qty{dispatchQtyUnitLabel && <span className="text-orange-500 font-medium ml-1">({dispatchQtyUnitLabel})</span>}
                          </th>
                          <th className="w-[11%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                            {quantityLabel}{quantityUnitLabel && <span className="text-orange-500 font-medium ml-1">({quantityUnitLabel})</span>}
                          </th>
                          <th className="w-[16%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">Remarks</th>
                          <th className="w-[13%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">Amount</th>
                          {!readOnly && <th className="w-16 px-4 py-2.5 text-right text-xs font-semibold text-foreground">Actions</th>}
                        </>
                      )}
                    </>
                  )}
                </tr>
              )}
            </thead>
            <tbody>
              {customTableBody ? customTableBody : filledLines.map((line) => {
                const isEditing = inlineEditUid === line.uid;
                const draft = isEditing ? inlineEditDraft : null;
                const draftInfo = draft?.productId
                  ? enrichProductForProcurement(Number(draft.productId))
                  : null;
                const displayHsn = draftInfo?.hsnCode ?? line.hsnCode;
                const displayPackaging = draftInfo?.packagingUnit ?? line.packagingUnit;
                const displayConversionQty = draftInfo?.conversionQty ?? line.conversionQty;
                const displayRatePerSku = draftInfo?.ratePerSku ?? line.ratePerSku;
                const displaySkuQty =
                  isEditing && draft
                    ? calcPackingToBaseQty(Number(draft.packingQty) || 0, displayConversionQty)
                    : line.totalQtyBase;
                const displayAmount = calcPrLineAmount(displayRatePerSku, displaySkuQty);

                return (
                  <tr
                    key={line.uid}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      mode === "purchase_request"
                        ? (isEditing ? "bg-brand-50/60" : "hover:bg-muted/20")
                        : "hover:bg-muted/20"
                    )}
                  >
                    {mode === "purchase_request" ? (
                      <>
                        <td className="px-4 py-2">
                          {isEditing && draft ? (
                            <AutocompleteSelect
                              options={products}
                              value={draft.productId}
                              onChange={(val) => {
                                setInlineEditDraft((prev) =>
                                  prev ? { ...prev, productId: String(val) } : prev,
                                );
                                setInlineEditError(null);
                              }}
                              placeholder="Select product..."
                              searchPlaceholder="Search product..."
                              className="h-8 rounded-lg text-xs"
                              disabled={disabled}
                            />
                          ) : (
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground">{line.productName}</p>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                <span className="font-mono font-semibold text-brand-700">{line.sku}</span>
                                {line.category ? ` · ${line.category}` : ""}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-foreground">{displayHsn || "—"}</td>
                        <td className="px-4 py-2 text-xs text-foreground">{displayPackaging}</td>
                        <td className="px-4 py-2 text-right">
                          {isEditing && draft ? (
                            <div className="space-y-0.5">
                              <Input
                                type="number"
                                min={1}
                                value={draft.packingQty}
                                onChange={(e) => {
                                  setInlineEditDraft((prev) =>
                                    prev ? { ...prev, packingQty: e.target.value } : prev,
                                  );
                                  setInlineEditError(null);
                                }}
                                className={cn(inputCls, "w-20 ml-auto text-right", inlineEditError && "border-red-400")}
                                disabled={disabled}
                              />
                              {inlineEditError && (
                                <p className="text-[10px] text-red-500 text-right">{inlineEditError}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs tabular-nums text-foreground">{line.requestedQty}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span className="text-xs font-semibold tabular-nums text-foreground">{displaySkuQty}</span>
                          {!isEditing && displayConversionQty > 1 && (
                            <p className="text-[10px] text-muted-foreground tabular-nums">
                              {line.requestedQty} × {displayConversionQty}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs tabular-nums text-foreground">
                          {formatCurrency(displayRatePerSku)}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums font-mono text-foreground">
                          {formatCurrency(displayAmount)}
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-2 text-right">
                            {isEditing ? (
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  title="Save"
                                  onClick={saveInlineEdit}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                                  disabled={disabled}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Cancel"
                                  onClick={cancelInlineEdit}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                                  disabled={disabled}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  type="button"
                                  title="Edit"
                                  onClick={() => startInlineEdit(line)}
                                  disabled={!!inlineEditUid || disabled}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  title="Remove"
                                  onClick={() => onRemoveItem && onRemoveItem(line.uid)}
                                  disabled={!!inlineEditUid || disabled}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-xs font-semibold text-foreground">
                          {line.productName}
                        </td>
                        <td className="px-4 py-2 text-xs font-mono font-semibold text-brand-700">
                          {line.sku}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-foreground">
                          {line.remarks.split("||")[2] || "0"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums text-foreground">
                          {(line as any).dispatched_quantity || "0"}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            max={
                              validateQuantityAsPieces
                                ? ((line as any).dispatched_quantity || 0) * piecesPerCase
                                : (line as any).dispatched_quantity
                            }
                            value={line.requestedQty || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "") {
                                if (onUpdateItem) onUpdateItem(line.uid, { requestedQty: 0 });
                              } else {
                                const num = Math.floor(Number(val));
                                if (!isNaN(num)) {
                                  if (onUpdateItem) onUpdateItem(line.uid, { requestedQty: num });
                                }
                              }
                            }}
                            className="h-8 w-20 text-xs text-right ml-auto rounded-lg"
                            disabled={disabled}
                          />
                        </td>
                        {shouldShowBreakdown && (
                          <td className="px-4 py-2">
                            {(() => {
                              const returnQty = line.requestedQty || 0;
                              const caseQty = Math.floor(returnQty / piecesPerCase);
                              const pieceQty = returnQty % piecesPerCase;
                              return (
                                <div className="flex items-center gap-1.5 select-none">
                                  <span className={cn(
                                    "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border transition-all",
                                    caseQty > 0 
                                      ? "bg-brand-50 border-brand-200/50 text-brand-700 font-bold"
                                      : "bg-slate-50 border-slate-200/40 text-slate-400"
                                  )}>
                                    {caseQty} Case{caseQty !== 1 && "s"}
                                  </span>
                                  <span className={cn(
                                    "inline-flex items-center rounded-lg px-2.5 py-0.5 text-[11px] font-semibold border transition-all",
                                    pieceQty > 0
                                      ? "bg-amber-50 border-amber-200/50 text-amber-700 font-bold"
                                      : "bg-slate-50 border-slate-200/40 text-slate-400"
                                  )}>
                                    {pieceQty} Piece{pieceQty !== 1 && "s"}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                        )}
                        <td className="px-4 py-2 text-left">
                          <Input
                            type="text"
                            value={line.remarks.split("||")[0] || ""}
                            onChange={(e) => {
                              if (onUpdateItem) onUpdateItem(line.uid, { remarks: e.target.value });
                            }}
                            placeholder="Optional remarks"
                            className="h-8 text-xs rounded-lg w-full"
                            disabled={disabled}
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-bold tabular-nums font-mono text-foreground">
                          {formatCurrency(line.requestedQty * line.ratePerSku)}
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              title="Remove"
                              onClick={() => {
                                if (onRemoveItem) onRemoveItem(line.uid);
                              }}
                              disabled={disabled}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {customTableFooter ? customTableFooter : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
              <p className="text-[11px] text-muted-foreground">
                {mode === "purchase_request" ? (
                  <>
                    Showing{" "}
                    <span className="font-medium text-foreground">{filledLines.length}</span> of{" "}
                    <span className="font-medium text-foreground">{filledLines.length}</span> items
                  </>
                ) : (
                  <>
                    {items.length} product(s) selected
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[11px] text-muted-foreground">
                  {mode === "purchase_request" ? "Total quantity: " : "Total return qty: "}
                  <span className="font-medium text-foreground tabular-nums">{totalPackingQty}</span>
                  {shouldShowBreakdown && (
                    <span className="ml-1 text-muted-foreground text-[10px]">
                      ({(() => {
                        const caseQty = Math.floor(totalPackingQty / piecesPerCase);
                        const pieceQty = totalPackingQty % piecesPerCase;
                        const caseLabel = caseQty === 1 ? "Case" : "Cases";
                        const pieceLabel = pieceQty === 1 ? "Piece" : "Pieces";
                        return `${caseQty} ${caseLabel} ${pieceQty} ${pieceLabel}`;
                      })()})
                    </span>
                  )}
                </p>
                {mode === "purchase_request" && (
                  <p className="text-[11px] text-muted-foreground">
                    Total SKU qty:{" "}
                    <span className="font-medium text-foreground tabular-nums">{totalSkuQty}</span>
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {mode === "purchase_request" ? "Total amount: " : "Sales Return Amount: "}
                  <span className="font-medium text-foreground tabular-nums font-mono">
                    {formatCurrency(totalAmountVal)}
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
