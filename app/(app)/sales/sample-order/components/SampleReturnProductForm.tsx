"use client";

import { Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { formatReturnAmount } from "../sample-return-data";
import { calcReturnLineAmount } from "../sample-return-utils";
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";
import type { PRLineItem } from "@/app/(app)/procurement/purchase-requests/pr-data";

interface SampleReturnProductFormProps {
  dispatch: DispatchRecord;
  checkedProducts: Record<string, boolean>;
  returnQuantities: Record<string, string>;
  returnRemarks: string;
  onCheckedChange: (sku: string, checked: boolean, defaultQty: number) => void;
  onQuantityChange: (sku: string, value: string) => void;
  onRemarksChange: (value: string) => void;

  selectedDispatchedProductId: string[];
  returnQuantity: string;
  returnProductRemarks: string;
  onProductChange: (val: string[]) => void;
  onQuantityChangeQuickAdd: (val: string) => void;
  onRemarksChangeQuickAdd: (val: string) => void;
  onAddItem: (productIds: string[], qty: number, remarks: string) => void;
  onRemoveItem: (uid: string) => void;
  onUpdateItem: (uid: string, patch: Partial<PRLineItem>) => void;
  productRemarks: Record<string, string>;
  onProductRemarksChange: (sku: string, val: string) => void;
}

export function SampleReturnProductForm({
  dispatch,
  checkedProducts,
  returnQuantities,
  returnRemarks,
  onCheckedChange,
  onQuantityChange,
  onRemarksChange,
  selectedDispatchedProductId,
  returnQuantity,
  returnProductRemarks,
  onProductChange,
  onQuantityChangeQuickAdd,
  onRemarksChangeQuickAdd,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  productRemarks,
  onProductRemarksChange,
}: SampleReturnProductFormProps) {
  let selectedCount = 0;
  let totalQty = 0;
  let totalAmount = 0;

  for (const p of dispatch.products) {
    if (!checkedProducts[p.sku]) continue;
    const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
    if (returnQty <= 0) continue;
    selectedCount += 1;
    totalQty += returnQty;
    totalAmount += calcReturnLineAmount(returnQty, p.unitRate ?? 0);
  }

  const returnProductItems: PRLineItem[] = dispatch.products
    .filter((p) => checkedProducts[p.sku])
    .map((p) => {
      const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
      return {
        uid: p.sku,
        productId: 1,
        productCode: p.sku,
        productName: p.product,
        description: "",
        sku: p.sku,
        baseUnit: "Unit",
        packagingUnit: "Unit",
        conversionQty: 1,
        requestUom: "Unit",
        requestedQty: returnQty,
        totalQtyBase: returnQty,
        segment: "",
        category: "",
        hsnCode: "",
        mrp: p.unitRate ?? 0,
        ratePerSku: p.unitRate ?? 0,
        uom: "Unit",
        remarks: `${productRemarks[p.sku] || ""}||${p.batchNo || "—"}||${p.packedQty || 0}`,
        dispatched_quantity: p.dispatchQty,
      } as any;
    });

  const dispatchedProductsOptions = dispatch.products
    .filter((p) => !checkedProducts[p.sku])
    .map((p) => ({
      value: p.sku,
      label: `${p.product} (${p.sku})`,
    }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <ProductItemDetailsSection
          mode="sales_return"
          products={dispatchedProductsOptions}
          selectedProductId={selectedDispatchedProductId}
          quantity={returnQuantity}
          remarks={returnProductRemarks}
          items={returnProductItems}
          onProductChange={onProductChange}
          onQuantityChange={onQuantityChangeQuickAdd}
          onRemarksChange={onRemarksChangeQuickAdd}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
          noBorder={true}
          title="Sample Products"
          description="Select dispatched sample products and enter return quantity"
          addButtonLabel="Add Item"
          showCasePieceBreakdown={true}
          piecesPerCase={10}
          quantityLabel="Unit Qty"
          quantityUnitLabel="Pieces"
          packedQtyUnitLabel="Cases"
          dispatchQtyUnitLabel="Cases"
          validateQuantityAsPieces={true}
        />
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-border rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {selectedCount} product(s) selected · {totalQty} total return qty
        </p>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sample Return Value</p>
          <p className="text-base font-bold text-red-600">{formatReturnAmount(totalAmount)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Return Remarks</p>
        <textarea
          value={returnRemarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          className="w-full h-20 text-xs border border-input rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Reason for return..."
        />
      </div>
    </div>
  );
}

export function getSampleReturnFormSummary(
  dispatch: DispatchRecord,
  checkedProducts: Record<string, boolean>,
  returnQuantities: Record<string, string>,
) {
  let totalQty = 0;
  let totalAmount = 0;
  let selectedCount = 0;

  for (const p of dispatch.products) {
    if (!checkedProducts[p.sku]) continue;
    const returnQty = parseFloat(returnQuantities[p.sku]) || 0;
    if (returnQty <= 0) continue;
    selectedCount += 1;
    totalQty += returnQty;
    totalAmount += calcReturnLineAmount(returnQty, p.unitRate ?? 0);
  }

  return { totalQty, totalAmount, selectedCount };
}
