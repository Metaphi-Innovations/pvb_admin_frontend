"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Boxes, ChevronDown, Layers3, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DispatchProduct, DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";
import { getPackingRecords } from "@/app/(app)/warehouse/packing/mock-data";
import type { PackedBatchAllocation, PackedProduct } from "@/app/(app)/warehouse/packing/types";
import { formatCaseLooseQuantity, formatReturnAmount, PIECES_PER_CASE } from "../sales-return-data";
import { calcReturnLineAmount } from "../sales-return-utils";

export interface BatchReturnInput {
  quantityType?: "Case" | "Piece";
  returnCaseQty: string;
  returnLooseQty: string;
}

export interface SalesReturnBatchRow {
  key: string;
  packingKey: string;
  packingNumber: string;
  packingDate?: string;
  productKey: string;
  productName: string;
  sku: string;
  batchNo: string;
  expiry?: string;
  dispatchedQtyCases: number;
  unitRate: number;
  returnedQtyPieces?: number;
  unitPerPacking?: number;
}

export interface SalesReturnProductGroup {
  key: string;
  packingKey: string;
  productName: string;
  sku: string;
  dispatchedQtyCases: number;
  batches: SalesReturnBatchRow[];
}

export interface SalesReturnPackingGroup {
  key: string;
  packingNumber: string;
  packingDate?: string;
  products: SalesReturnProductGroup[];
}

export interface SalesReturnSummary {
  packingListCount: number;
  productCount: number;
  batchCount: number;
  selectedProductCount: number;
  selectedBatchCount: number;
  totalReturnCaseQty: number;
  totalReturnLooseQty: number;
  totalReturnPieces: number;
  totalAmount: number;
  invalidBatchCount: number;
}

interface SalesReturnProductFormProps {
  packingGroups: SalesReturnPackingGroup[];
  returnEntries: Record<string, BatchReturnInput>;
  returnRemarks: string;
  summary: SalesReturnSummary;
  onQuantityTypeChange: (batchKey: string, type: "Case" | "Piece") => void;
  onCaseQtyChange: (batchKey: string, value: string) => void;
  onLooseQtyChange: (batchKey: string, value: string) => void;
  onRemarksChange: (value: string) => void;
}

interface BatchReturnComputation {
  caseQty: number;
  looseQty: number;
  totalPieces: number;
  amount: number;
  errors: string[];
}

interface PackingProductCandidate {
  packingNumber: string;
  packingDate?: string;
  product: PackedProduct;
  candidateKey: string;
  packingIndex: number;
  productIndex: number;
}

function parseQty(value?: string): number {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatStatusQuantity(totalPieces: number, unitPerPacking: number = 10) {
  const caseQty = Math.floor(totalPieces / unitPerPacking);
  const looseQty = totalPieces % unitPerPacking;
  return formatCaseLooseQuantity(caseQty, looseQty);
}

function formatDateLabel(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatExpiryLabel(value?: string) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { month: "2-digit", year: "numeric" });
}

function getBatchComputation(batch: SalesReturnBatchRow, entry?: BatchReturnInput): BatchReturnComputation {
  const uKey = batch.unitPerPacking || 10;
  const caseQty = parseQty(entry?.returnCaseQty);
  const looseQty = parseQty(entry?.returnLooseQty);
  const totalPieces = caseQty * uKey + looseQty;
  const maxPieces = batch.dispatchedQtyCases * uKey;
  const prevReturned = batch.returnedQtyPieces || 0;
  const remainingPieces = Math.max(0, maxPieces - prevReturned);
  const errors: string[] = [];

  if (looseQty > uKey - 1) {
    errors.push(`Loose qty must be between 0 and ${uKey - 1}.`);
  }
  if (totalPieces > remainingPieces) {
    errors.push("Return quantity cannot exceed remaining batch quantity.");
  }

  return {
    caseQty,
    looseQty,
    totalPieces,
    amount: calcReturnLineAmount(totalPieces, batch.unitRate ?? 0),
    errors,
  };
}

function buildPackingCandidates(dispatch: DispatchRecord): PackingProductCandidate[] {
  const packingMap = new Map(getPackingRecords().map((record) => [record.packingNo, record]));
  return dispatch.packingNumbers.flatMap((packingNumber, packingIndex) => {
    const packing = packingMap.get(packingNumber);
    if (!packing) return [];
    return packing.products.map((product, productIndex) => ({
      packingNumber,
      packingDate: packing.packingDate,
      product,
      candidateKey: `${packingNumber}::${product.sku}::${productIndex}`,
      packingIndex,
      productIndex,
    }));
  });
}

function scorePackingCandidate(dispatchProduct: DispatchProduct, candidate: PackingProductCandidate) {
  let score = 0;
  if (candidate.product.sku === dispatchProduct.sku) score += 10;
  if (candidate.product.product === dispatchProduct.product) score += 6;
  if (candidate.product.packedQty === dispatchProduct.dispatchQty) score += 3;
  const dispatchBatches = new Set(dispatchProduct.batchAllocations?.map((item) => item.batchNumber) ?? (dispatchProduct.batchNo ? [dispatchProduct.batchNo] : []));
  const candidateBatches = new Set(candidate.product.batchAllocations?.map((item) => item.batchNumber) ?? []);
  for (const batchNo of dispatchBatches) {
    if (candidateBatches.has(batchNo)) score += 5;
  }
  score -= candidate.packingIndex * 0.01;
  score -= candidate.productIndex * 0.001;
  return score;
}

function resolveDispatchProductMeta(dispatch: DispatchRecord) {
  const candidates = buildPackingCandidates(dispatch);
  const usedCandidates = new Set<string>();

  return dispatch.products.map((dispatchProduct, index) => {
    const matchedCandidate = candidates
      .filter((candidate) => !usedCandidates.has(candidate.candidateKey))
      .map((candidate) => ({ candidate, score: scorePackingCandidate(dispatchProduct, candidate) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)[0]?.candidate;

    if (matchedCandidate) usedCandidates.add(matchedCandidate.candidateKey);

    const safePackingNumbers = dispatch.packingNumbers || [];
    return {
      dispatchProduct,
      packingNumber: matchedCandidate?.packingNumber ?? (safePackingNumbers.length > 0 ? safePackingNumbers[Math.min(index, Math.max(safePackingNumbers.length - 1, 0))] : dispatch.dispatchNumber),
      packingDate: matchedCandidate?.packingDate,
      packingProduct: matchedCandidate?.product,
    };
  });
}

function buildBatchRows(dispatchProduct: DispatchProduct & { returnedQtyPieces?: number; unitPerPacking?: number }, packingNumber: string, packingDate: string | undefined, packingKey: string, productKey: string, rowIndex: number, packingProduct?: PackedProduct): SalesReturnBatchRow[] {
  const batchAllocations = dispatchProduct.batchAllocations?.length
    ? dispatchProduct.batchAllocations
    : packingProduct?.batchAllocations?.length
      ? packingProduct.batchAllocations
      : [];

  if (batchAllocations.length > 0) {
    return batchAllocations.map((allocation: PackedBatchAllocation & { returnedQtyPieces?: number; unitPerPacking?: number }, allocationIndex) => ({
      key: `${packingKey}::${dispatchProduct.sku}::${allocation.batchNumber || allocationIndex}::${rowIndex}::${allocationIndex}`,
      packingKey,
      packingNumber,
      packingDate,
      productKey,
      productName: dispatchProduct.product,
      sku: dispatchProduct.sku,
      batchNo: allocation.batchNumber || dispatchProduct.batchNo || `Batch ${allocationIndex + 1}`,
      expiry: allocation.expiryDate || dispatchProduct.batchExpiryDate,
      dispatchedQtyCases: allocation.allocatedQty,
      unitRate: dispatchProduct.unitRate ?? 0,
      returnedQtyPieces: allocation.returnedQtyPieces ?? dispatchProduct.returnedQtyPieces ?? 0,
      unitPerPacking: allocation.unitPerPacking ?? dispatchProduct.unitPerPacking ?? 10,
    }));
  }

  if (dispatchProduct.batchNo) {
    return [{
      key: `${packingKey}::${dispatchProduct.sku}::${dispatchProduct.batchNo}::${rowIndex}`,
      packingKey,
      packingNumber,
      packingDate,
      productKey,
      productName: dispatchProduct.product,
      sku: dispatchProduct.sku,
      batchNo: dispatchProduct.batchNo,
      expiry: dispatchProduct.batchExpiryDate,
      dispatchedQtyCases: dispatchProduct.dispatchQty,
      unitRate: dispatchProduct.unitRate ?? 0,
      returnedQtyPieces: dispatchProduct.returnedQtyPieces ?? 0,
      unitPerPacking: dispatchProduct.unitPerPacking ?? 10,
    }];
  }

  return [];
}

export function buildSalesReturnPackingGroups(dispatch: DispatchRecord): SalesReturnPackingGroup[] {
  const packingGroups = new Map<string, SalesReturnPackingGroup>();
  const fallbackPackingNumber = (dispatch.packingNumbers && dispatch.packingNumbers.length > 0) ? dispatch.packingNumbers[0] : dispatch.dispatchNumber;

  resolveDispatchProductMeta(dispatch).forEach(({ dispatchProduct, packingNumber, packingDate, packingProduct }, rowIndex) => {
    const resolvedPackingNumber = packingNumber || fallbackPackingNumber;
    if (!resolvedPackingNumber) return;
    const packingKey = resolvedPackingNumber;
    const productKey = `${packingKey}::${dispatchProduct.sku}`;
    const batchRows = buildBatchRows(dispatchProduct, resolvedPackingNumber, packingDate, packingKey, productKey, rowIndex, packingProduct);

    if (!packingGroups.has(packingKey)) {
      packingGroups.set(packingKey, {
        key: packingKey,
        packingNumber: resolvedPackingNumber,
        packingDate,
        products: [],
      });
    }

    const packingGroup = packingGroups.get(packingKey)!;
    const existingProduct = packingGroup.products.find((product) => product.key === productKey);
    if (existingProduct) {
      existingProduct.dispatchedQtyCases += dispatchProduct.dispatchQty;
      existingProduct.batches.push(...batchRows);
      return;
    }

    packingGroup.products.push({
      key: productKey,
      packingKey,
      productName: dispatchProduct.product,
      sku: dispatchProduct.sku,
      dispatchedQtyCases: dispatchProduct.dispatchQty,
      batches: batchRows,
    });
  });

  return Array.from(packingGroups.values()).map((group) => ({
    ...group,
    products: group.products.sort((left, right) => left.productName.localeCompare(right.productName)),
  }));
}

export function getSalesReturnFormSummary(packingGroups: SalesReturnPackingGroup[], returnEntries: Record<string, BatchReturnInput>): SalesReturnSummary {
  const selectedProducts = new Set<string>();
  let selectedBatchCount = 0;
  let totalReturnCaseQty = 0;
  let totalReturnLooseQty = 0;
  let totalReturnPieces = 0;
  let totalAmount = 0;
  let batchCount = 0;
  let productCount = 0;
  let invalidBatchCount = 0;

  for (const packingGroup of packingGroups) {
    productCount += packingGroup.products.length;
    for (const product of packingGroup.products) {
      batchCount += product.batches.length;
      for (const batch of product.batches) {
        const computation = getBatchComputation(batch, returnEntries[batch.key]);
        if (computation.errors.length > 0) invalidBatchCount += 1;
        if (computation.totalPieces <= 0) continue;
        selectedProducts.add(product.key);
        selectedBatchCount += 1;
        totalReturnCaseQty += computation.caseQty;
        totalReturnLooseQty += computation.looseQty;
        totalReturnPieces += computation.totalPieces;
        totalAmount += computation.amount;
      }
    }
  }

  return {
    packingListCount: packingGroups.length,
    productCount,
    batchCount,
    selectedProductCount: selectedProducts.size,
    selectedBatchCount,
    totalReturnCaseQty,
    totalReturnLooseQty,
    totalReturnPieces,
    totalAmount,
    invalidBatchCount,
  };
}

export function flattenSelectedBatchReturns(packingGroups: SalesReturnPackingGroup[], returnEntries: Record<string, BatchReturnInput>) {
  return packingGroups.flatMap((packingGroup) =>
    packingGroup.products.flatMap((product) =>
      product.batches.flatMap((batch) => {
        const computation = getBatchComputation(batch, returnEntries[batch.key]);
        if (computation.totalPieces <= 0 || computation.errors.length > 0) return [];
        return [{
          product: product.productName,
          sku: product.sku,
          packedQty: batch.dispatchedQtyCases,
          dispatchQty: batch.dispatchedQtyCases,
          returnQty: computation.totalPieces,
          unitRate: batch.unitRate,
          batchNo: batch.batchNo,
          batchExpiryDate: batch.expiry,
          packingNumber: packingGroup.packingNumber,
          packingDate: packingGroup.packingDate,
          returnCaseQty: computation.caseQty,
          returnLooseQty: computation.looseQty,
          returnTotalPieces: computation.totalPieces,
          lineAmount: computation.amount,
          quantityType: returnEntries[batch.key]?.quantityType || "Piece",
        }];
      }),
    ),
  );
}

function useOpenState(defaultKeys: string[]) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set(defaultKeys));
  const toggle = (key: string) => {
    setOpenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  return { openKeys, toggle };
}

export function SalesReturnProductForm({
  packingGroups,
  returnEntries,
  returnRemarks,
  summary,
  onQuantityTypeChange,
  onCaseQtyChange,
  onLooseQtyChange,
  onRemarksChange,
}: SalesReturnProductFormProps) {
  const defaultPackingKeys = useMemo(() => (packingGroups.length > 0 ? [packingGroups[0].key] : []), [packingGroups]);
  const defaultProductKeys = useMemo(() => (packingGroups[0]?.products[0] ? [packingGroups[0].products[0].key] : []), [packingGroups]);
  const packingOpenState = useOpenState(defaultPackingKeys);
  const productOpenState = useOpenState(defaultProductKeys);

  if (packingGroups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-foreground">No packing list found for this dispatch.</p>
          <p className="mt-1 text-xs text-muted-foreground">Linked packing references are required to capture batch-wise returns.</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Return Remarks</p>
          <Textarea value={returnRemarks} onChange={(event) => onRemarksChange(event.target.value)} className="min-h-[88px] text-xs" placeholder="Reason for return..." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Dispatched Products / Return Products</h2>
              <p className="text-xs text-muted-foreground">Select packing-list batches and enter return quantity in cases and loose pieces.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Badge variant="outline" className="rounded-full border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold text-orange-700">Packing Lists: {summary.packingListCount}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold">Products: {summary.productCount}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold">Batches: {summary.batchCount}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold">Return: {formatCaseLooseQuantity(summary.totalReturnCaseQty, summary.totalReturnLooseQty)}</Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px] font-semibold">Amount: {formatReturnAmount(summary.totalAmount)}</Badge>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {packingGroups.map((packingGroup) => {
          const packingProductsWithReturn = new Set<string>();
          let packingSelectedBatches = 0;
          let packingReturnCaseQty = 0;
          let packingReturnLooseQty = 0;
          let packingReturnAmount = 0;
          let packingTotalBatches = 0;
          let packingDispatchedQty = 0;

          for (const product of packingGroup.products) {
            packingDispatchedQty += product.dispatchedQtyCases;
            packingTotalBatches += product.batches.length;
            for (const batch of product.batches) {
              const computation = getBatchComputation(batch, returnEntries[batch.key]);
              if (computation.totalPieces <= 0) continue;
              packingProductsWithReturn.add(product.key);
              packingSelectedBatches += 1;
              packingReturnCaseQty += computation.caseQty;
              packingReturnLooseQty += computation.looseQty;
              packingReturnAmount += computation.amount;
            }
          }

          const isPackingOpen = packingOpenState.openKeys.has(packingGroup.key);

          return (
            <div key={packingGroup.key} className={cn("overflow-hidden rounded-xl border bg-white shadow-sm transition-colors", isPackingOpen ? "border-orange-200 ring-1 ring-orange-100" : "border-border")}>
              <button
                type="button"
                onClick={() => packingOpenState.toggle(packingGroup.key)}
                className={cn("flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors lg:flex-row lg:items-center lg:justify-between", isPackingOpen ? "bg-orange-50/70" : "bg-slate-50/60 hover:bg-slate-50")}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-orange-700">{packingGroup.packingNumber}</span>
                    {packingGroup.packingDate ? <span className="text-[11px] font-medium text-muted-foreground">Packed {formatDateLabel(packingGroup.packingDate)}</span> : null}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{packingGroup.products.length} Products</span>
                    <span>{packingTotalBatches} Batches</span>
                    <span>Dispatched: {packingDispatchedQty} Cases</span>
                    <span>Return: {formatCaseLooseQuantity(packingReturnCaseQty, packingReturnLooseQty)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start lg:self-center">
                  <Badge variant="outline" className="rounded-full border-orange-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-orange-700">{packingProductsWithReturn.size} Products Selected</Badge>
                  <Badge variant="outline" className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold">{packingSelectedBatches} Batches Selected</Badge>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</p>
                    <p className="text-xs font-bold text-foreground">{formatReturnAmount(packingReturnAmount)}</p>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isPackingOpen && "rotate-180 text-orange-600")} />
                </div>
              </button>

              {isPackingOpen ? (
                <div className="border-t border-border px-4 py-4">
                  {packingGroup.products.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-4 py-6 text-center text-xs text-muted-foreground">No products found in this packing list.</div>
                  ) : (
                    <div className="space-y-3">
                      {packingGroup.products.map((product) => {
                        let productReturnCaseQty = 0;
                        let productReturnLooseQty = 0;
                        let productReturnPieces = 0;
                        let productReturnAmount = 0;
                        let productHasErrors = false;

                        for (const batch of product.batches) {
                          const computation = getBatchComputation(batch, returnEntries[batch.key]);
                          if (computation.errors.length > 0) productHasErrors = true;
                          productReturnCaseQty += computation.caseQty;
                          productReturnLooseQty += computation.looseQty;
                          productReturnPieces += computation.totalPieces;
                          productReturnAmount += computation.amount;
                        }

                        const isProductOpen = productOpenState.openKeys.has(product.key);

                        return (
                          <div key={product.key} className="overflow-hidden rounded-xl border border-border bg-white">
                            <button
                              type="button"
                              onClick={() => productOpenState.toggle(product.key)}
                              className={cn("flex w-full flex-col gap-3 px-4 py-3 text-left transition-colors lg:flex-row lg:items-center lg:justify-between", isProductOpen ? "bg-orange-50/40" : "bg-white hover:bg-slate-50/70")}
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-foreground">{product.productName}</span>
                                  {productHasErrors ? (
                                    <Badge variant="outline" className="rounded-full border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">Validation Error</Badge>
                                  ) : productReturnPieces > 0 ? (
                                    <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Selected</Badge>
                                  ) : (
                                    <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Pending</Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                  <span>SKU: {product.sku}</span>
                                  <span>Dispatched: {product.dispatchedQtyCases} Cases</span>
                                  <span>Return: {formatCaseLooseQuantity(productReturnCaseQty, productReturnLooseQty)}</span>
                                  <span>Total Pieces: {productReturnPieces}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 self-start lg:self-center">
                                <div className="text-right">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</p>
                                  <p className="text-xs font-bold text-foreground">{formatReturnAmount(productReturnAmount)}</p>
                                </div>
                                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isProductOpen && "rotate-180 text-orange-600")} />
                              </div>
                            </button>

                            {isProductOpen ? (
                              <div className="border-t border-border px-4 py-4">
                                {product.batches.length === 0 ? (
                                  <div className="rounded-lg border border-dashed border-border bg-slate-50/60 px-4 py-6 text-center text-xs text-muted-foreground">No batch details found for this product.</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full min-w-[920px] border-collapse text-left">
                                      <thead>
                                        <tr className="border-b border-border bg-slate-50/70">
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Batch No.</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expiry</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Dispatched Qty</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Prev. Returned</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Remaining Qty</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cases</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pieces</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center">Total Unit Qty</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Amount</th>
                                          <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {product.batches.map((batch) => {
                                          const computation = getBatchComputation(batch, returnEntries[batch.key]);
                                          const statusTone = computation.errors.length > 0 ? "text-red-600" : computation.totalPieces > 0 ? "text-emerald-700" : "text-muted-foreground";

                                          const entry = returnEntries[batch.key] || {};
                                          const qtyType = entry.quantityType || "Piece";
                                          const isCaseType = qtyType === "Case";

                                          const uKey = batch.unitPerPacking || 10;

                                          const dispatchedQty = batch.dispatchedQtyCases;
                                          const dispatchedCases = Math.floor(dispatchedQty);
                                          const dispatchedPieces = Math.round((dispatchedQty - dispatchedCases) * uKey);

                                          const dispatchDisplay = dispatchedPieces > 0
                                            ? `${dispatchedCases} Case${dispatchedCases !== 1 ? "s" : ""} ${dispatchedPieces} Piece${dispatchedPieces !== 1 ? "s" : ""}`
                                            : `${dispatchedCases} Case${dispatchedCases !== 1 ? "s" : ""}`;

                                          const prevReturnedPieces = batch.returnedQtyPieces || 0;
                                          const prevReturnedCases = Math.floor(prevReturnedPieces / uKey);
                                          const prevReturnedLoose = prevReturnedPieces % uKey;
                                          const prevReturnedDisplay = prevReturnedPieces > 0
                                            ? formatCaseLooseQuantity(prevReturnedCases, prevReturnedLoose)
                                            : "0";

                                          const maxPieces = batch.dispatchedQtyCases * uKey;
                                          const remainingPieces = Math.max(0, maxPieces - prevReturnedPieces);
                                          const remainingCases = Math.floor(remainingPieces / uKey);
                                          const remainingLoose = remainingPieces % uKey;
                                          const remainingDisplay = remainingPieces > 0
                                            ? formatCaseLooseQuantity(remainingCases, remainingLoose)
                                            : "0";

                                          return (
                                            <tr key={batch.key} className="border-b border-border/70 align-top">
                                              <td className="px-3 py-3">
                                                <div className="space-y-1">
                                                  <p className="font-mono text-xs font-semibold text-foreground">{batch.batchNo || "-"}</p>
                                                  <p className="text-[11px] text-muted-foreground">{batch.packingNumber}</p>
                                                </div>
                                              </td>
                                              <td className="px-3 py-3 text-xs text-muted-foreground">{formatExpiryLabel(batch.expiry)}</td>
                                              <td className="px-3 py-3 text-center text-xs font-semibold text-foreground">{dispatchDisplay}</td>
                                              <td className="px-3 py-3 text-center text-xs font-semibold text-foreground">{prevReturnedDisplay}</td>
                                              <td className="px-3 py-3 text-center text-xs font-semibold text-foreground">{remainingDisplay}</td>
                                              <td className="px-2 py-2 w-[90px]">
                                                <Select
                                                  value={qtyType}
                                                  onValueChange={(val) => onQuantityTypeChange(batch.key, val as "Case" | "Piece")}
                                                >
                                                  <SelectTrigger className="h-8 text-xs rounded border-border bg-white w-full px-2">
                                                    <SelectValue placeholder="Type" />
                                                  </SelectTrigger>
                                                  <SelectContent className="min-w-[100px]">
                                                    <SelectItem value="Case">Case</SelectItem>
                                                    <SelectItem value="Piece">Piece</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </td>
                                              <td className="px-2 py-2 w-20">
                                                <Input disabled={!isCaseType} value={!isCaseType ? "" : (entry.returnCaseQty || "")} onChange={(event) => onCaseQtyChange(batch.key, event.target.value)} inputMode="numeric" className="h-8 text-xs w-full disabled:opacity-50" placeholder="0" />
                                              </td>
                                              <td className="px-2 py-2 w-20">
                                                <Input disabled={isCaseType} value={isCaseType ? "" : (entry.returnLooseQty || "")} onChange={(event) => onLooseQtyChange(batch.key, event.target.value)} inputMode="numeric" className="h-8 text-xs w-full disabled:opacity-50" placeholder="0" />
                                              </td>
                                              <td className="px-3 py-3 w-24">
                                                <Input disabled value={computation.totalPieces || ""} className="h-8 text-xs w-full font-semibold bg-muted text-muted-foreground text-center" placeholder="0" />
                                              </td>
                                              <td className="px-3 py-3 text-right text-xs font-semibold text-foreground">{formatReturnAmount(computation.amount)}</td>
                                              <td className="px-3 py-3">
                                                <div className={cn("space-y-1 text-[11px] font-medium", statusTone)}>
                                                  {computation.errors.length > 0 ? (
                                                    <div className="flex items-start gap-1">
                                                      <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                                                      <div>{computation.errors.map((error) => <p key={error}>{error}</p>)}</div>
                                                    </div>
                                                  ) : computation.totalPieces > 0 ? (
                                                    <p>Selected - {formatStatusQuantity(computation.totalPieces)}</p>
                                                  ) : (
                                                    <p>No return selected</p>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-3.5 w-3.5 text-orange-600" />
              <span>Total Products Selected: <span className="font-semibold text-foreground">{summary.selectedProductCount}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Boxes className="h-3.5 w-3.5 text-orange-600" />
              <span>Total Batches Selected: <span className="font-semibold text-foreground">{summary.selectedBatchCount}</span></span>
            </div>
            <div>Total Return Qty: <span className="font-semibold text-foreground">{formatCaseLooseQuantity(summary.totalReturnCaseQty, summary.totalReturnLooseQty)}</span></div>
            <div>Total Return Pieces: <span className="font-semibold text-foreground">{summary.totalReturnPieces}</span></div>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sales Return Amount</p>
            <p className="text-lg font-bold text-red-600">{formatReturnAmount(summary.totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Return Remarks</p>
        <Textarea value={returnRemarks} onChange={(event) => onRemarksChange(event.target.value)} className="min-h-[88px] text-xs" placeholder="Reason for return..." />
      </div>
    </div>
  );
}
