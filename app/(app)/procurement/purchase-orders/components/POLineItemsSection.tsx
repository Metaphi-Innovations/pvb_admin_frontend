"use client";

import React, { useMemo, useState } from "react";
import { Check, Package, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { IndianRupeeInput } from "@/components/ui/IndianRupeeInput";
import { cn } from "@/lib/utils";
import { axiosInstance } from "@/api/axios";
import { formatCurrency, calcLineAmounts, applyTaxSupplyToRates, type TaxSupplyType } from "@/lib/procurement/utils";
import {
  applyGstMasterToTaxRates,
  findGstMasterIdByTotalPct,
  getActiveGstMasterOptions,
  getDefaultGstMasterId,
  totalGstPctFromRates,
} from "@/lib/procurement/gst-master-utils";
import {
  calcPackingToBaseQty,
  enrichProductForProcurement,
  enrichProductFromDropdown,
} from "@/lib/procurement/procurement-line-utils";
import { resolvePurchaseCostPrice } from "@/lib/pricing/resolve-pricing";
import { useProductDropdown } from "@/hooks/masters/use-products";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import type { PurchaseRequest } from "../../purchase-requests/pr-data";
import type { POLineItem } from "../po-data";
import type { POFormValues } from "./PurchaseOrderForm";
import { emptyPOLine } from "./PurchaseOrderForm";
import type { ProductDropdownItem } from "@/services/product-dropdown.service";

const inputCls = "h-8 rounded-lg text-xs";

function TaxPctAmountCell({ pct, amount }: { pct: number; amount: number }) {
  return (
    <div className="space-y-0.5 text-right">
      <p className="text-xs tabular-nums text-foreground">{pct}%</p>
      <p className="text-[10px] tabular-nums font-medium text-muted-foreground">{formatCurrency(amount)}</p>
    </div>
  );
}

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage" },
  { value: "flat", label: "Flat Amount" },
];

interface InlineEditDraft {
  productId: string;
  packingQty: string;
  unitPrice: string;
  discountType: "percentage" | "flat";
  discountPct: string;
  discountFlatAmount: string;
  gstMasterId: string;
  remarks: string;
}

function packagingUnitToOrderUom(packagingUnit: string): POLineItem["orderUom"] {
  const norm = packagingUnit.toLowerCase();
  if (norm.includes("case")) return "Case";
  if (norm.includes("box")) return "Box";
  if (norm.includes("carton")) return "Carton";
  return "Unit";
}

function asLocalSupplierId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    return n > 0 ? n : undefined;
  }
  return undefined;
}

function lineFromProduct(
  productId: number | string,
  packingQty: number,
  supplierId?: number | string,
  taxSupplyType: TaxSupplyType = "intra",
  dbProducts?: ProductDropdownItem[],
): POLineItem | null {
  const info = enrichProductFromDropdown(productId, dbProducts);
  if (!info) return null;
  const cp = resolvePurchaseCostPrice(productId, typeof supplierId === "number" ? supplierId : undefined);
  const gst = parseFloat(findProductRefGst(productId, dbProducts).replace(/%/g, "")) || 0;
  const taxRates = applyTaxSupplyToRates(gst, taxSupplyType);
  const orderUom = packagingUnitToOrderUom(info.packagingUnit);
  const orderedQtyPack = packingQty;
  const orderedQty = calcPackingToBaseQty(orderedQtyPack, info.conversionQty);
  return {
    ...emptyPOLine(),
    productId: info.productId,
    productCode: info.productCode,
    productName: info.productName,
    description: info.description,
    sku: info.sku,
    category: info.category,
    hsnCode: info.hsnCode,
    baseUnit: info.baseUnit,
    packagingUnit: info.packagingUnit,
    conversionQty: info.conversionQty,
    orderUom,
    orderedQtyPack,
    uom: orderUom,
    orderedQty,
    unitPrice: cp.amount,
    cpSource: cp.source,
    ...taxRates,
  };
}

function findProductRefGst(productId: number | string, dbProducts?: ProductDropdownItem[]): string {
  const dbProd = (dbProducts || []).find((x) => String(x.product_id) === String(productId));
  if (dbProd?.gst_rate) return `${dbProd.gst_rate.gstPercentage}%`;
  const p = loadProducts().find((x) => String(x.id) === String(productId));
  return p?.gstRate ?? "18%";
}

interface POLineItemsSectionProps {
  form: POFormValues;
  onChange: (f: POFormValues) => void;
  readOnly?: boolean;
  poType: "pr" | "direct";
  previewLines: POLineItem[];
  linkedPr: PurchaseRequest | null;
  taxSupplyType?: TaxSupplyType;
  supplierState?: string;
  linesError?: string;
}

export function POLineItemsSection({
  form,
  onChange,
  readOnly,
  poType,
  previewLines,
  linkedPr,
  taxSupplyType = "intra",
  supplierState,
  linesError,
}: POLineItemsSectionProps) {
  const [quickProductIds, setQuickProductIds] = useState<string[]>([]);
  const [quickQty, setQuickQty] = useState("1");
  const [quickDiscountType, setQuickDiscountType] = useState<"percentage" | "flat">("percentage");
  const [quickDiscountPct, setQuickDiscountPct] = useState("0");
  const [quickDiscountFlat, setQuickDiscountFlat] = useState("0");
  const [quickRemarks, setQuickRemarks] = useState("");
  const [inlineEditUid, setInlineEditUid] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<InlineEditDraft | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);

  const { data: dbProducts } = useProductDropdown();
  const masterProducts = useMemo(
    () => loadProducts().filter((p) => p.status === "active"),
    [],
  );
  const gstOptions = useMemo(() => getActiveGstMasterOptions(), []);
  const productOptions = useMemo(() => {
    const list = (dbProducts || []).map((p) => ({
      value: String(p.product_id),
      label: `${p.product_name} (${p.sku || p.product_code})`,
    }));
    if (list.length === 0) {
      return masterProducts.map((p) => ({
        value: String(p.id),
        label: `${p.productName} (${p.sku || p.productId})`,
      }));
    }
    return list;
  }, [dbProducts, masterProducts]);

  const filledLines = form.lines.filter((l) => Boolean(l.productId) && l.productId !== 0 && l.productId !== "0");
  const totalPackingQty = filledLines.reduce((sum, l) => sum + (l.orderedQtyPack || 0), 0);
  const totalSkuQty = filledLines.reduce((sum, l) => sum + (l.orderedQty || 0), 0);
  const totalAmount = previewLines.reduce((sum, l) => sum + (l.netAmount || 0), 0);

  const previewProductId = quickProductIds[0];
  const previewInfo = previewProductId ? enrichProductFromDropdown(previewProductId, dbProducts) : null;
  const previewSkuQty = previewInfo
    ? calcPackingToBaseQty(Number(quickQty) || 0, previewInfo.conversionQty)
    : 0;

  const patch = (p: Partial<POFormValues>) => onChange({ ...form, ...p });

  const updateLine = (uid: string, p: Partial<POLineItem>) => {
    patch({
      lines: form.lines.map((l) => {
        if (l.uid !== uid) return l;
        const next = { ...l, ...p };
        next.orderedQty = calcPackingToBaseQty(next.orderedQtyPack, next.conversionQty);
        next.uom = next.orderUom;
        return next;
      }),
    });
  };

  const clearQuickFields = () => {
    setQuickProductIds([]);
    setQuickQty("1");
    setQuickDiscountType("percentage");
    setQuickDiscountPct("0");
    setQuickDiscountFlat("0");
    setQuickRemarks("");
  };

  const cancelInlineEdit = () => {
    setInlineEditUid(null);
    setInlineEditDraft(null);
    setInlineEditError(null);
  };

  const quickAdd = async () => {
    if (quickProductIds.length === 0) return;
    const packingQty = Number(quickQty) || 1;
    const discountType = quickDiscountType;
    const discountPct = discountType === "percentage" ? Number(quickDiscountPct) || 0 : 0;
    const discountFlatAmount = discountType === "flat" ? Number(quickDiscountFlat) || 0 : 0;
    let nextLines = [...form.lines];

    const pricingPromises = quickProductIds.map(async (productId) => {
      try {
        const targetState = supplierState || form.state;
        if (targetState) {
          const res = await axiosInstance.post("/master/product/pricing", {
            product_id: productId,
            state_name: targetState,
          });
          if (res.data?.success && res.data?.data) {
            return {
              productId,
              cost_price: res.data.data.cost_price,
              success: true
            };
          }
        }
      } catch (err) {
        console.error(`Failed to fetch pricing for product ${productId}:`, err);
      }
      return { productId, success: false };
    });

    const resolvedPricings = await Promise.all(pricingPromises);
    const pricingMap = new Map(resolvedPricings.map((p) => [p.productId, p]));

    for (const idStr of quickProductIds) {
      const productId = idStr;
      const line = lineFromProduct(productId, packingQty, form.supplierId, taxSupplyType, dbProducts);
      if (!line) continue;

      const apiPricing = pricingMap.get(productId);
      if (apiPricing && apiPricing.success) {
        line.unitPrice = apiPricing.cost_price;
        line.cpSource = "pricing_master";
      }

      nextLines.push({
        ...line,
        uid: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        discountType,
        discountPct,
        discountFlatAmount,
        remarks: quickRemarks,
      });
    }
    patch({ lines: nextLines });
    clearQuickFields();
  };

  const startInlineEdit = (line: POLineItem) => {
    const gstPct = totalGstPctFromRates(line.cgstPct, line.sgstPct, line.igstPct);
    const gstMasterId = findGstMasterIdByTotalPct(gstPct) ?? getDefaultGstMasterId();
    setInlineEditUid(line.uid);
    setInlineEditDraft({
      productId: String(line.productId),
      packingQty: String(line.orderedQtyPack),
      unitPrice: String(line.unitPrice),
      discountType: line.discountType ?? "percentage",
      discountPct: String(line.discountPct ?? 0),
      discountFlatAmount: String(line.discountFlatAmount ?? 0),
      gstMasterId: String(gstMasterId),
      remarks: line.remarks ?? "",
    });
    setInlineEditError(null);
  };

  const saveInlineEdit = () => {
    if (!inlineEditUid || !inlineEditDraft) return;
    const packingQty = Number(inlineEditDraft.packingQty);
    if (!packingQty || packingQty <= 0) {
      setInlineEditError("Quantity is required and must be greater than 0");
      return;
    }
    const productId = inlineEditDraft.productId;
    if (!productId) {
      setInlineEditError("Product is required");
      return;
    }
    const base = lineFromProduct(productId, packingQty, form.supplierId, taxSupplyType, dbProducts);
    if (!base) return;
    const taxRates = applyGstMasterToTaxRates(Number(inlineEditDraft.gstMasterId), taxSupplyType);
    const existing = form.lines.find((l) => l.uid === inlineEditUid);
    const keepProduct = poType === "pr" && existing?.prLineUid;
    updateLine(inlineEditUid, {
      ...(keepProduct
        ? {}
        : {
            productId: base.productId,
            productCode: base.productCode,
            productName: base.productName,
            description: base.description,
            sku: base.sku,
            category: base.category,
            hsnCode: base.hsnCode,
            baseUnit: base.baseUnit,
            packagingUnit: base.packagingUnit,
            conversionQty: base.conversionQty,
            orderUom: base.orderUom,
          }),
      orderedQtyPack: packingQty,
      unitPrice: Number(inlineEditDraft.unitPrice) || 0,
      cpSource: "manual",
      discountType: inlineEditDraft.discountType,
      discountPct: Number(inlineEditDraft.discountPct) || 0,
      discountFlatAmount: Number(inlineEditDraft.discountFlatAmount) || 0,
      remarks: inlineEditDraft.remarks,
      ...taxRates,
    });
    cancelInlineEdit();
  };

  const removeLine = (uid: string) => {
    patch({ lines: form.lines.filter((l) => l.uid !== uid) });
    if (inlineEditUid === uid) cancelInlineEdit();
  };

  const getPreviewLine = (uid: string) => previewLines.find((l) => l.uid === uid);

  const getRequestedQty = (line: POLineItem) => {
    if (!line.prLineUid || !linkedPr) return null;
    const prLine = linkedPr.lines.find((l) => l.uid === line.prLineUid);
    return prLine?.totalQtyBase ?? prLine?.requestedQty ?? null;
  };

  return (
    <div id="po-field-lines" className="border-t border-border/60 pt-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <SectionHead
            label="Product / Item Details"
            sub="Packaging quantity, SKU conversion, discount and GST are auto-calculated from product master."
            required={!readOnly}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-2.5 md:mb-0">
          <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700">
            {filledLines.length} item{filledLines.length === 1 ? "" : "s"}
          </span>
          {filledLines.length > 0 && (
            <>
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                {totalSkuQty} SKU qty
              </span>
              <span className="inline-flex h-6 items-center rounded-full bg-muted px-2.5 text-[11px] font-semibold text-muted-foreground">
                {formatCurrency(totalAmount)}
              </span>
            </>
          )}
        </div>
      </div>

      {linesError && (
        <p className="mb-2 text-[11px] text-red-500">{linesError}</p>
      )}

      {poType === "direct" && !readOnly && (
        <div className="mb-3 mt-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_80px_110px_96px_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Product</Label>
              <AutocompleteSelect
                options={productOptions}
                value={quickProductIds}
                onChange={(val) => setQuickProductIds(Array.isArray(val) ? val.map(String) : [])}
                multiple
                placeholder="Search or select products..."
                searchPlaceholder="Search product..."
                className="h-8 rounded-lg text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Discount Type</Label>
              <AutocompleteSelect
                options={DISCOUNT_TYPE_OPTIONS}
                value={quickDiscountType}
                onChange={(v) => setQuickDiscountType(v as "percentage" | "flat")}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                {quickDiscountType === "percentage" ? "Discount %" : "Discount Amt"}
              </Label>
              {quickDiscountType === "percentage" ? (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={quickDiscountPct}
                  onChange={(e) => setQuickDiscountPct(e.target.value)}
                  className={inputCls}
                />
              ) : (
                <IndianRupeeInput
                  value={Number(quickDiscountFlat) || 0}
                  onChange={(n) => setQuickDiscountFlat(String(n))}
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Input
                value={quickRemarks}
                onChange={(e) => setQuickRemarks(e.target.value)}
                placeholder="Optional"
                className={inputCls}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={quickAdd}
                disabled={quickProductIds.length === 0 || !!inlineEditUid}
                className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </Button>
            </div>
          </div>
          {previewInfo && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/60 bg-white px-3 py-2 text-[11px]">
              <span>
                <span className="text-muted-foreground">HSN: </span>
                <span className="font-mono font-medium">{previewInfo.hsnCode || "—"}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Packaging: </span>
                <span className="font-medium">{previewInfo.packagingUnit}</span>
              </span>
              <span>
                <span className="text-muted-foreground">Total SKU Qty: </span>
                <span className="font-semibold text-brand-700 tabular-nums">{previewSkuQty}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {filledLines.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/70" />
          <p className="text-sm font-semibold text-foreground">No products added yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {poType === "pr" ? "Select a purchase request to load products." : "Add products to build this order."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
          <table className="w-full min-w-[900px] table-fixed">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="min-w-[180px] px-3 py-2.5 text-left text-xs font-semibold text-foreground">Product</th>
                <th className="w-20 px-3 py-2.5 text-left text-xs font-semibold text-foreground">HSN</th>
                <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold text-foreground">Packaging</th>
                {poType === "pr" && (
                  <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">PR Qty</th>
                )}
                <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Qty</th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">SKU Qty</th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Rate/SKU</th>
                <th className="w-24 px-3 py-2.5 text-left text-xs font-semibold text-foreground">Disc. Type</th>
                <th className="w-20 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Disc. %</th>
                <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Disc. Amt</th>
                <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold text-foreground">GST %</th>
                {taxSupplyType === "intra" ? (
                  <>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">CGST</th>
                    <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">SGST</th>
                  </>
                ) : (
                  <th className="w-24 px-3 py-2.5 text-right text-xs font-semibold text-foreground">IGST</th>
                )}
                <th className="w-28 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Total</th>
                <th className="min-w-[100px] px-3 py-2.5 text-left text-xs font-semibold text-foreground">Remarks</th>
                {!readOnly && (
                  <th className="w-16 px-3 py-2.5 text-right text-xs font-semibold text-foreground">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filledLines.map((line) => {
                const isEditing = inlineEditUid === line.uid;
                const draft = isEditing ? inlineEditDraft : null;
                const draftInfo = draft?.productId
                  ? enrichProductFromDropdown(draft.productId, dbProducts)
                  : null;
                const calcLine = getPreviewLine(line.uid);
                const displayHsn = draftInfo?.hsnCode ?? line.hsnCode;
                const displayPackaging = draftInfo?.packagingUnit ?? line.packagingUnit;
                const displayConversion = draftInfo?.conversionQty ?? line.conversionQty;
                const displaySkuQty =
                  isEditing && draft
                    ? calcPackingToBaseQty(Number(draft.packingQty) || 0, displayConversion)
                    : line.orderedQty;
                const displayRate = isEditing && draft ? Number(draft.unitPrice) || 0 : line.unitPrice;
                const displayDiscType = isEditing && draft ? draft.discountType : line.discountType ?? "percentage";
                const displayDiscPct = isEditing && draft ? Number(draft.discountPct) || 0 : line.discountPct;
                const displayDiscFlat =
                  isEditing && draft ? Number(draft.discountFlatAmount) || 0 : line.discountFlatAmount ?? 0;
                const draftTaxRates =
                  isEditing && draft
                    ? applyGstMasterToTaxRates(Number(draft.gstMasterId), taxSupplyType)
                    : null;
                const displayGstPct = draftTaxRates
                  ? totalGstPctFromRates(
                      draftTaxRates.cgstPct,
                      draftTaxRates.sgstPct,
                      draftTaxRates.igstPct,
                    )
                  : totalGstPctFromRates(line.cgstPct, line.sgstPct, line.igstPct);
                const discAmt = calcLine?.discountAmount ?? line.discountAmount ?? 0;
                const lineTax = calcLine
                  ? calcLineAmounts({
                      orderedQty: line.orderedQty,
                      unitPrice: isEditing && draft ? Number(draft.unitPrice) || 0 : line.unitPrice,
                      discountType: displayDiscType,
                      discountPct: displayDiscPct,
                      discountFlatAmount: displayDiscFlat,
                      cgstPct: draftTaxRates?.cgstPct ?? line.cgstPct,
                      sgstPct: draftTaxRates?.sgstPct ?? line.sgstPct,
                      igstPct: draftTaxRates?.igstPct ?? line.igstPct,
                    })
                  : calcLineAmounts({
                      orderedQty: line.orderedQty,
                      unitPrice: line.unitPrice,
                      discountType: line.discountType,
                      discountPct: line.discountPct,
                      discountFlatAmount: line.discountFlatAmount,
                      cgstPct: line.cgstPct,
                      sgstPct: line.sgstPct,
                      igstPct: line.igstPct,
                    });
                const displayCgstPct = draftTaxRates?.cgstPct ?? line.cgstPct;
                const displaySgstPct = draftTaxRates?.sgstPct ?? line.sgstPct;
                const displayIgstPct = draftTaxRates?.igstPct ?? line.igstPct;
                const netAmt = calcLine?.netAmount ?? line.netAmount ?? 0;
                const canEditRow = !readOnly;
                const canChangeProduct = poType === "direct";

                return (
                  <tr
                    key={line.uid}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      isEditing ? "bg-brand-50/60" : "hover:bg-muted/20",
                    )}
                  >
                    <td className="px-3 py-2">
                      {isEditing && draft && canChangeProduct ? (
                        <AutocompleteSelect
                          options={productOptions}
                          value={draft.productId}
                          onChange={async (val) => {
                            const productId = String(val);
                            const gst = parseFloat(findProductRefGst(productId, dbProducts).replace(/%/g, "")) || 0;
                            const gstMasterId =
                              findGstMasterIdByTotalPct(gst) ?? getDefaultGstMasterId();
                            let price = 0;
                            try {
                              const targetState = supplierState || form.state;
                              if (targetState) {
                                const res = await axiosInstance.post("/master/product/pricing", {
                                  product_id: productId,
                                  state_name: targetState,
                                });
                                if (res.data?.success && res.data?.data) {
                                  price = res.data.data.cost_price;
                                }
                              }
                            } catch (err) {
                              console.error("Failed to fetch product pricing on change:", err);
                            }
                            setInlineEditDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    productId: String(val),
                                    gstMasterId: String(gstMasterId),
                                    unitPrice: price ? String(price) : prev.unitPrice,
                                  }
                                : prev,
                            );
                            setInlineEditError(null);
                          }}
                          className="h-8 rounded-lg text-xs"
                        />
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-foreground">{line.productName}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            <span className="font-mono font-semibold text-brand-700">{line.sku}</span>
                            {line.category ? ` · ${line.category}` : ""}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{displayHsn || "—"}</td>
                    <td className="px-3 py-2 text-xs">{displayPackaging}</td>
                    {poType === "pr" && (
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-muted-foreground">
                        {getRequestedQty(line) ?? "—"}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
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
                            className={cn(inputCls, "w-16 ml-auto text-right", inlineEditError && "border-red-400")}
                          />
                          {inlineEditError && (
                            <p className="text-[10px] text-red-500 text-right">{inlineEditError}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs tabular-nums">{line.orderedQtyPack}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-xs font-semibold tabular-nums">{displaySkuQty}</td>
                    <td className="px-3 py-2 text-right">
                    <span className="text-xs tabular-nums">{formatCurrency(displayRate)}</span>
                      {/* {isEditing && draft ? (
                        <IndianRupeeInput
                          value={Number(draft.unitPrice) || 0}
                          onChange={(n) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, unitPrice: String(n) } : prev,
                            )
                          }
                          className={cn(inputCls, "w-24 ml-auto")}
                        />
                      ) : (
                        <span className="text-xs tabular-nums">{formatCurrency(displayRate)}</span>
                      )} */}
                    </td>
                    <td className="px-3 py-2">
                      {isEditing && draft ? (
                        <AutocompleteSelect
                          options={DISCOUNT_TYPE_OPTIONS}
                          value={draft.discountType}
                          onChange={(v) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, discountType: v as "percentage" | "flat" } : prev,
                            )
                          }
                          className={inputCls}
                        />
                      ) : (
                        <span className="text-xs capitalize">{displayDiscType}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing && draft && displayDiscType === "percentage" ? (
                        <Input
                          type="number"
                          min={0}
                          value={draft.discountPct}
                          onChange={(e) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, discountPct: e.target.value } : prev,
                            )
                          }
                          className={cn(inputCls, "w-16 ml-auto text-right")}
                        />
                      ) : (
                        <span className="text-xs tabular-nums">
                          {displayDiscType === "percentage" ? `${displayDiscPct}%` : "—"}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {isEditing && draft && displayDiscType === "flat" ? (
                        <IndianRupeeInput
                          value={Number(draft.discountFlatAmount) || 0}
                          onChange={(n) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, discountFlatAmount: String(n) } : prev,
                            )
                          }
                          className={cn(inputCls, "w-20 ml-auto")}
                        />
                      ) : (
                        <span className="text-xs tabular-nums">{formatCurrency(discAmt)}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                    <span className="text-xs tabular-nums">{displayGstPct}%</span>
                      {/* {isEditing && draft ? (
                        <AutocompleteSelect
                          options={gstOptions}
                          value={draft.gstMasterId}
                          onChange={(val) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, gstMasterId: String(val) } : prev,
                            )
                          }
                          placeholder="Select GST…"
                          className={cn(inputCls, "ml-auto min-w-[88px]")}
                        />
                      ) : (
                        <span className="text-xs tabular-nums">{displayGstPct}%</span>
                      )} */}
                    </td>
                    {taxSupplyType === "intra" ? (
                      <>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={displayCgstPct} amount={lineTax.cgstAmount} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <TaxPctAmountCell pct={displaySgstPct} amount={lineTax.sgstAmount} />
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 align-top">
                        <TaxPctAmountCell pct={displayIgstPct} amount={lineTax.igstAmount} />
                      </td>
                    )}
                    <td className="px-4 py-2 text-right text-xs font-semibold tabular-nums font-mono text-foreground">
                      {formatCurrency(netAmt)}
                    </td>
                    <td className="px-4 py-2">
                      {isEditing && draft ? (
                        <Input
                          value={draft.remarks}
                          onChange={(e) =>
                            setInlineEditDraft((prev) =>
                              prev ? { ...prev, remarks: e.target.value } : prev,
                            )
                          }
                          placeholder="Optional"
                          className={cn(inputCls, "min-w-[100px]")}
                        />
                      ) : (
                        <span
                          className="block max-w-[140px] truncate text-xs text-muted-foreground"
                          title={line.remarks || undefined}
                        >
                          {line.remarks || "—"}
                        </span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-3 py-2 text-right">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              title="Save"
                              onClick={saveInlineEdit}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Cancel"
                              onClick={cancelInlineEdit}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
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
                              disabled={!!inlineEditUid}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand-600 hover:bg-brand-50 disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {poType === "direct" && (
                              <button
                                type="button"
                                title="Remove"
                                onClick={() => removeLine(line.uid)}
                                disabled={!!inlineEditUid}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filledLines.length}</span> items
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] text-muted-foreground">
                Total qty: <span className="font-medium tabular-nums">{totalPackingQty}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total SKU qty: <span className="font-medium tabular-nums">{totalSkuQty}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Total amount: <span className="font-medium tabular-nums font-mono">{formatCurrency(totalAmount)}</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
