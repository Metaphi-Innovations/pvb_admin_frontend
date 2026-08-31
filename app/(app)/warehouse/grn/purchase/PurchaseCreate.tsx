"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Upload, AlertCircle, Plus, Trash2, AlertTriangle, Loader2, FileText, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { GrnItem } from "../shared/types";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Field, TextField } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";
import { useGrnPreviewNumber, useCreateGrn, useUpdateGrn, useGrn } from "@/hooks/warehouse/use-grn";
import { useExtractInvoice } from "@/hooks/warehouse/use-invoice-extraction";
import {
  normalizeExtractionDate,
  type InvoiceExtractionItem,
  type InvoiceExtractionResult,
} from "@/services/invoice-extraction.service";
import { showToast } from "@/lib/toast";
import {
  usePurchaseOrder,
  usePurchaseOrderDropdown,
  usePurchaseOrderSupplierDropdown,
  usePurchaseOrderWarehouseDropdown,
} from "@/hooks/procurement/use-purchase-orders";
import type { POLineItem } from "@/app/(app)/procurement/purchase-orders/po-data";
import { round2 } from "@/lib/procurement/utils";
import type {
  CreateGrnExtractedInvoiceItemPayload,
  CreateGrnPayload,
  UpdateGrnPayload,
} from "@/services/grn.service";
import type { GrnRecord } from "../shared/types";
import {
  DEFAULT_NEW_GRN_QUANTITY_TYPE,
  formatQtyStackInline,
  formatStackNum,
  resolveGrnQtyStack,
  sumGrnQtyStacks,
  type GrnQuantityType,
  fromBaseQuantity,
  resolvePoGrnQuantityType,
  resolvePackingSize,
  toBaseQuantity,
} from "@/lib/warehouse/grn-quantity";
import { formatWeightQty, resolveNetWeightPerPack } from "@/lib/procurement/procurement-line-utils";
import { StackedQtyCell } from "../shared/components/StackedQtyCell";
import {
  GRN_QTY_INPUT_CLASSNAME,
  GRN_QTY_PLACEHOLDER,
  ProductSkuCell,
} from "../shared/components/ProductSkuCell";
import { PartialGrnConfirmDialog, type PartialGrnProductRow } from "../shared/components/PartialGrnConfirmDialog";
import {
  exceedsMaxLineQty,
  maxLineQtyMessage,
} from "@/lib/quantity-limits";

interface ManualInvoiceRow {
  id: string;
  sourceItemId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  /** Invoice qty in Case / Piece (matches Order Items Summary quantity type). */
  displayQty: number;
  /** Invoice qty in base units — sent to API as quantity_base_qty. */
  quantity: number;
  unitPrice: number;
  gstPct: number;
  gstAmount: number;
  totalAmount: number;
}

function createEmptyRow(): ManualInvoiceRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceItemId: "",
    productId: "",
    productName: "",
    productCode: "",
    unit: "",
    batchNumber: "",
    mfgDate: "",
    expDate: "",
    displayQty: 0,
    quantity: 0,
    unitPrice: 0,
    gstPct: 0,
    gstAmount: 0,
    totalAmount: 0,
  };
}

function itemKey(sourceItemId: string) {
  return sourceItemId;
}

function getLineGstPct(line: POLineItem): number {
  return round2((line.cgstPct || 0) + (line.sgstPct || 0) + (line.igstPct || 0));
}

function getAlreadyReceivedBase(line: POLineItem): number {
  const conversion = line.conversionQty || 1;
  return round2((line.receivedQty ?? 0) * conversion);
}

function getShortClosedBase(line: POLineItem): number {
  const conversion = line.conversionQty || 1;
  return round2((line.shortClosedQty ?? 0) * conversion);
}

function getPendingBase(line: POLineItem, excludeBaseQty = 0): number {
  return Math.max(
    0,
    round2(
      line.orderedQty - (getAlreadyReceivedBase(line) - excludeBaseQty) - getShortClosedBase(line),
    ),
  );
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: unknown; error?: unknown } } })
      .response;
    const apiMsg = response?.data?.message ?? response?.data?.error;
    if (typeof apiMsg === "string" && apiMsg.trim()) return apiMsg;
  }
  return fallback;
}

function normalizeMatchText(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function normalizeSkuMatchText(value: string | null | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getPoLineId(line: POLineItem): string {
  return line.purchaseOrderProductId || line.uid || "";
}

/** Prefer real SKU; fall back to product code only if SKU is missing. */
function getPoLineSku(line: POLineItem): string {
  return normalizeSkuMatchText(line.sku || line.productCode);
}

/**
 * Match extracted invoice item → PO line by SKU only (order-independent).
 * Invoice SKU is compared against PO line.sku (from product master).
 */
function matchExtractedItemToPoLine(
  item: InvoiceExtractionItem,
  lines: POLineItem[],
): POLineItem | null {
  const sku = normalizeSkuMatchText(item.sku);
  if (!sku) return null;

  const skuMatchedLines = lines.filter((line) => {
    const code = getPoLineSku(line);
    return code.length > 0 && code === sku;
  });

  if (skuMatchedLines.length === 0) return null;
  if (skuMatchedLines.length === 1) return skuMatchedLines[0];

  // If there are multiple PO lines sharing the same SKU, differentiate using product name keywords.
  const itemWords = (item.product_name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  let bestLine: POLineItem | null = null;
  let maxMatchedWords = 0;

  for (const line of skuMatchedLines) {
    const lineWords = (line.productName || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const overlap = lineWords.filter((w) => itemWords.includes(w)).length;
    if (overlap > maxMatchedWords) {
      maxMatchedWords = overlap;
      bestLine = line;
    }
  }

  return bestLine || skuMatchedLines[0];
}

/**
 * Snapshot OCR billed lines for PO invoice items (immutable after extract).
 * Manual Invoice Entry edits must NOT change this snapshot.
 */
function buildExtractedInvoiceItemsSnapshot(
  result: InvoiceExtractionResult,
  poLines: POLineItem[],
): CreateGrnExtractedInvoiceItemPayload[] {
  if (!result.items.length) return [];

  const snapshot: CreateGrnExtractedInvoiceItemPayload[] = [];

  for (const item of result.items) {
    const matched = matchExtractedItemToPoLine(item, poLines);
    const lineId = matched ? getPoLineId(matched) : "";


    const qty =
      item.total_quantity != null && Number.isFinite(item.total_quantity)
        ? Math.max(0, item.total_quantity)
        : 0;

    const taxableFromOcr =
      item.amount != null && Number.isFinite(item.amount)
        ? Math.max(0, item.amount)
        : null;

    let rate: number | null =
      item.price != null && Number.isFinite(item.price) ? item.price : null;
    if (rate == null && taxableFromOcr != null && qty > 0) {
      rate = round2(taxableFromOcr / qty);
    }

    const taxable =
      taxableFromOcr != null
        ? taxableFromOcr
        : rate != null
          ? round2(qty * rate)
          : 0;

    const gst =
      item.gst_percentage != null && Number.isFinite(item.gst_percentage)
        ? item.gst_percentage
        : null;
    const gstAmount =
      gst != null ? round2((taxable * gst) / 100) : null;

    const productId =
      matched?.productId != null && String(matched.productId).trim()
        ? String(matched.productId)
        : null;

    snapshot.push({
      purchase_order_product_id: lineId || null,
      product_id: productId,
      invoice_qty: qty,
      invoice_rate: rate,
      invoice_amount: taxable,
      gst,
      gst_amount: gstAmount,
      extracted_data: {
        sku: item.sku,
        product_name: item.product_name,
        batch_number: item.batch_number,
        mfg_date: item.mfg_date,
        exp_date: item.exp_date,
        total_quantity: item.total_quantity,
        bag_case_quantity: item.bag_case_quantity,
        price: item.price,
        gst_percentage: item.gst_percentage,
        amount: item.amount,
      },
    });
  }

  return snapshot;
}

function calcAmounts(qty: number, unitPrice: number, gstPct: number) {
  const taxable = round2(qty * unitPrice);
  const gstAmount = round2((taxable * gstPct) / 100);
  return {
    gstAmount,
    totalAmount: round2(taxable + gstAmount),
  };
}

interface ReceiptItem extends GrnItem {
  sourceItemId: string;
  /** Max base qty this GRN may receive (excludes this GRN's posted qty on edit). */
  maxReceivableQty: number;
}

function itemQtyMeta(it: Pick<GrnItem, "unitPerPacking" | "netWeightPerPack" | "weightUom">) {
  return {
    packingSize: it.unitPerPacking || 1,
    netWeightPerPack: it.netWeightPerPack,
    weightUom: it.weightUom,
  };
}

function itemQtyStack(
  baseQty: number,
  it: Pick<GrnItem, "unitPerPacking" | "netWeightPerPack" | "weightUom">,
) {
  return resolveGrnQtyStack(baseQty, itemQtyMeta(it));
}

function buildItemsFromPoLines(
  po: { poNumber: string; lines: POLineItem[] },
  options?: {
    /** This GRN's current received qty by source_item_id (edit mode). */
    thisGrnQtyBySourceItem?: Map<string, number>;
    /** Prefill received quantities from existing GRN. */
    prefillReceivedBySourceItem?: Map<string, number>;
    /** Prefill quantity_type from existing GRN items. */
    prefillQuantityTypeBySourceItem?: Map<string, GrnQuantityType>;
    /** Default quantity type for newly added rows. */
    defaultQuantityType?: GrnQuantityType;
  },
): ReceiptItem[] {
  const thisGrnQtyBySourceItem = options?.thisGrnQtyBySourceItem;
  const prefillReceivedBySourceItem = options?.prefillReceivedBySourceItem;
  const prefillQuantityTypeBySourceItem = options?.prefillQuantityTypeBySourceItem;
  const defaultQuantityType =
    options?.defaultQuantityType ?? DEFAULT_NEW_GRN_QUANTITY_TYPE;

  return po.lines
    .filter((line) => {
      if (!line.purchaseOrderProductId) return false;
      const exclude = thisGrnQtyBySourceItem?.get(line.purchaseOrderProductId) ?? 0;
      const maxReceivable = getPendingBase(line, exclude);
      const prefill = prefillReceivedBySourceItem?.get(line.purchaseOrderProductId) ?? 0;
      return maxReceivable > 0 || prefill > 0;
    })
    .map((line) => {
      const sourceItemId = line.purchaseOrderProductId as string;
      const exclude = thisGrnQtyBySourceItem?.get(sourceItemId) ?? 0;
      const alreadyReceivedQty = Math.max(0, round2(getAlreadyReceivedBase(line) - exclude));
      // Cap for this receipt (other GRNs only) — used for over-receive validation.
      const maxReceivableQty = getPendingBase(line, exclude);
      const unitPerPacking = resolvePackingSize({
        unitPerPacking: line.conversionQty || 0,
      }) || 1;
      const receivedQty = prefillReceivedBySourceItem?.get(sourceItemId) ?? 0;
      // Live PO pending after this GRN's current received qty.
      const pendingQty = Math.max(0, round2(maxReceivableQty - receivedQty));
      const quantityType = DEFAULT_NEW_GRN_QUANTITY_TYPE;
      const displayQty =
        receivedQty > 0
          ? round2(
            fromBaseQuantity({
              baseQty: receivedQty,
              quantityType,
              packingSize: unitPerPacking,
            }),
          )
          : 0;
      const receivedCases =
        quantityType === "CASE"
          ? displayQty
          : unitPerPacking > 0
            ? Math.floor(receivedQty / unitPerPacking)
            : receivedQty;
      const receivedLooseQty =
        quantityType === "CASE"
          ? 0
          : unitPerPacking > 0
            ? round2(receivedQty - Math.floor(receivedQty / unitPerPacking) * unitPerPacking)
            : 0;
      const weightMeta =
        line.netWeightPerPack && line.weightUom
          ? { netWeightPerPack: line.netWeightPerPack, weightUom: line.weightUom }
          : resolveNetWeightPerPack({
            netWeight: line.netWeightPerPack ?? null,
            packSize: line.packSize ?? null,
            unitPerPacking,
            baseUnit: line.baseUnit || line.uom || "Unit",
          });
      return {
        sourceItemId,
        productId: String(line.productId || ""),
        productName: line.productName,
        productCode: line.sku || line.productCode,
        orderedQty: line.orderedQty,
        alreadyReceivedQty,
        pendingQty,
        maxReceivableQty,
        receivedQty,
        displayQty,
        quantityType,
        receivedCases,
        receivedLooseQty,
        unitPerPacking,
        packSize: line.packSize,
        netWeightPerPack: weightMeta?.netWeightPerPack,
        weightUom: weightMeta?.weightUom,
        unit: line.baseUnit || line.uom || "Unit",
        poNumber: po.poNumber,
      };
    });
}

function buildManualRowsFromGrn(grn: GrnRecord): ManualInvoiceRow[] {
  if (!grn.batches.length) return [createEmptyRow()];

  return grn.batches.map((batch, idx) => {
    const matchingItem = grn.items.find((it) => it.productId === batch.productId);
    const sourceItemId = matchingItem?.sourceItemId || "";
    const packingSize = matchingItem?.unitPerPacking || 1;
    const quantityType = resolvePoGrnQuantityType(matchingItem?.quantityType);
    const qty = batch.quantity || 0;
    const displayQty = round2(
      fromBaseQuantity({
        baseQty: qty,
        quantityType,
        packingSize,
      }),
    );
    const unitPrice = batch.unitPrice || 0;
    const gstPct = batch.gstPct || 0;
    const amounts = calcAmounts(qty, unitPrice, gstPct);
    return {
      id: `edit-row-${idx}-${batch.batchNumber || idx}`,
      sourceItemId,
      productId: batch.productId,
      productName: batch.productName,
      productCode: batch.productCode || "",
      unit: matchingItem?.unit || "Unit",
      batchNumber: batch.batchNumber || "",
      mfgDate: batch.mfgDate || "",
      expDate: batch.expDate || "",
      displayQty,
      quantity: qty,
      unitPrice,
      gstPct,
      ...amounts,
    };
  });
}

function validateManualRow(row: ManualInvoiceRow): string | null {
  if (!row.sourceItemId || !row.productName) return "Product is required";
  if (!row.mfgDate.trim()) return "MFG Date is required";
  if (!row.expDate.trim()) return "Expiry Date is required";
  if (row.quantity <= 0) return "Quantity must be greater than 0";
  if (exceedsMaxLineQty(row.displayQty)) {
    return maxLineQtyMessage("Invoice quantity");
  }
  if (row.mfgDate && row.expDate && row.expDate < row.mfgDate) {
    return "Expiry Date cannot be before MFG Date";
  }
  return null;
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/5 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PurchaseCreate({
  mode = "create",
  grnId,
}: {
  mode?: "create" | "edit";
  grnId?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(grnId);

  const [grnNo, setGrnNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [manualRows, setManualRows] = useState<ManualInvoiceRow[]>([createEmptyRow()]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemWarnings, setItemWarnings] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);
  const [partialProducts, setPartialProducts] = useState<PartialGrnProductRow[]>([]);
  const [editPrefillDone, setEditPrefillDone] = useState(false);
  const [editItemsSeeded, setEditItemsSeeded] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [extractionErrors, setExtractionErrors] = useState<string[]>([]);
  const [supplierMatch, setSupplierMatch] = useState<boolean | null>(null);
  const [unmatchedSupplier, setUnmatchedSupplier] = useState<string | null>(null);
  /** OCR billed lines for PO invoice items — not updated when user edits Manual Invoice Entry. */
  const [extractedInvoiceItems, setExtractedInvoiceItems] = useState<
    CreateGrnExtractedInvoiceItemPayload[]
  >([]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const grnDateError = useMemo(() => {
    if (grnDate > todayStr) return "GRN Date cannot be in the future.";
    if (invoiceDate && grnDate < invoiceDate) return "GRN Date cannot be before Invoice Date.";
    return undefined;
  }, [grnDate, invoiceDate, todayStr]);

  const invoiceDateError = useMemo(() => {
    if (invoiceDate > todayStr) return "Invoice Date cannot be in the future.";
    if (grnDate && invoiceDate > grnDate) return "Invoice Date cannot be after GRN Date.";
    return undefined;
  }, [invoiceDate, grnDate, todayStr]);

  const { data: previewNumber, refetch: refetchPreviewNumber } =
    useGrnPreviewNumber(!isEdit, warehouseId);
  const extractInvoiceMutation = useExtractInvoice();
  const {
    data: existingGrn,
    isLoading: grnLoading,
    isError: grnError,
    error: grnLoadError,
  } = useGrn(grnId, isEdit);
  const { data: supplierOptions = [], isLoading: suppliersLoading } =
    usePurchaseOrderSupplierDropdown(true);
  const { data: poOptions = [], isLoading: posLoading } = usePurchaseOrderDropdown(
    { supplier_id: supplierId || undefined },
    Boolean(supplierId),
  );
  const { data: warehouseOptions = [] } = usePurchaseOrderWarehouseDropdown(
    supplierId || undefined,
    Boolean(supplierId),
  );
  const {
    data: selectedPo,
    isLoading: poDetailsLoading,
    isError: poDetailsError,
  } = usePurchaseOrder(selectedPoId || undefined);
  const createGrnMutation = useCreateGrn();
  const updateGrnMutation = useUpdateGrn();

  const thisGrnQtyBySourceItem = useMemo(() => {
    const map = new Map<string, number>();
    if (!isEdit || !existingGrn) return map;
    for (const it of existingGrn.items) {
      const key = it.sourceItemId;
      if (!key) continue;
      map.set(key, round2((map.get(key) ?? 0) + (it.receivedQty || 0)));
    }
    return map;
  }, [isEdit, existingGrn]);

  const thisGrnQuantityTypeBySourceItem = useMemo(() => {
    const map = new Map<string, GrnQuantityType>();
    if (!isEdit || !existingGrn) return map;
    for (const it of existingGrn.items) {
      const key = it.sourceItemId;
      if (!key) continue;
      map.set(key, DEFAULT_NEW_GRN_QUANTITY_TYPE);
    }
    return map;
  }, [isEdit, existingGrn]);

  useEffect(() => {
    if (isEdit) return;
    setGrnNo(previewNumber || "");
  }, [isEdit, previewNumber]);

  // Prefill header fields from existing GRN (once)
  useEffect(() => {
    if (!isEdit || !existingGrn || editPrefillDone) return;

    if (existingGrn.status === "qc_completed") {
      setFormError("This GRN cannot be edited because QC is already completed.");
      return;
    }

    setGrnNo(existingGrn.grnNo || "");
    setSupplierId(existingGrn.supplierId || "");
    setSelectedPoId(existingGrn.sourceId || "");
    setWarehouseId(existingGrn.warehouseUuid || "");
    setGrnDate(existingGrn.grnDate || new Date().toISOString().split("T")[0]);
    setInvoiceNumber(existingGrn.invoiceNumber || "");
    setInvoiceDate(existingGrn.invoiceDate || new Date().toISOString().split("T")[0]);
    setManualRows(buildManualRowsFromGrn(existingGrn));
    setEditPrefillDone(true);
  }, [isEdit, existingGrn, editPrefillDone]);

  const poLines = useMemo(() => {
    if (!selectedPo?.lines) return [] as POLineItem[];
    if (isEdit) {
      return selectedPo.lines.filter((line) => {
        if (!line.purchaseOrderProductId) return false;
        const exclude = thisGrnQtyBySourceItem.get(line.purchaseOrderProductId) ?? 0;
        return getPendingBase(line, exclude) > 0 || exclude > 0;
      });
    }
    return selectedPo.lines.filter((line) => getPendingBase(line) > 0);
  }, [selectedPo, isEdit, thisGrnQtyBySourceItem]);

  useEffect(() => {
    if (!selectedPo) {
      if (!isEdit) setItems([]);
      return;
    }

    if (isEdit) {
      if (!editPrefillDone || editItemsSeeded || !existingGrn) return;
      setItems(
        buildItemsFromPoLines(selectedPo, {
          thisGrnQtyBySourceItem,
          prefillReceivedBySourceItem: thisGrnQtyBySourceItem,
          prefillQuantityTypeBySourceItem: thisGrnQuantityTypeBySourceItem,
        }),
      );
      setEditItemsSeeded(true);
      return;
    }

    setItems(
      buildItemsFromPoLines(selectedPo, {
        defaultQuantityType: DEFAULT_NEW_GRN_QUANTITY_TYPE,
      }),
    );
  }, [
    selectedPo,
    isEdit,
    editPrefillDone,
    editItemsSeeded,
    existingGrn,
    thisGrnQtyBySourceItem,
    thisGrnQuantityTypeBySourceItem,
  ]);

  useEffect(() => {
    if (isEdit) return;
    if (selectedPo?.warehouseId) {
      setWarehouseId(String(selectedPo.warehouseId));
    }
  }, [isEdit, selectedPo?.warehouseId]);

  const productOptions = useMemo(
    () =>
      poLines.map((line) => {
        const sku = line.sku || line.productCode || "";
        return {
          value: line.purchaseOrderProductId || line.uid,
          label: sku ? `${line.productName} (${sku})` : line.productName,
          sublabel: sku || undefined,
          searchText: `${line.productName} ${sku} ${line.productCode || ""}`.trim(),
        };
      }),
    [poLines],
  );

  const warehouseSelectOptions = useMemo(() => {
    const fromPo =
      selectedPo?.warehouseId && selectedPo.warehouseName
        ? [
          {
            value: String(selectedPo.warehouseId),
            label: selectedPo.warehouseName,
          },
        ]
        : [];
    const fromApi = warehouseOptions.map((w) => ({
      value: w.value,
      label: w.label,
    }));
    const merged = [...fromPo];
    for (const opt of fromApi) {
      if (!merged.some((m) => m.value === opt.value)) merged.push(opt);
    }
    if (
      warehouseId &&
      !merged.some((m) => m.value === warehouseId) &&
      existingGrn?.warehouse
    ) {
      merged.unshift({
        value: warehouseId,
        label: existingGrn.warehouse,
      });
    }
    return merged;
  }, [selectedPo, warehouseOptions, warehouseId, existingGrn?.warehouse]);

  const getReceivedQtyForProduct = useCallback(
    (sourceItemId: string) => {
      const item = items.find((it) => it.sourceItemId === sourceItemId);
      return item?.receivedQty ?? 0;
    },
    [items],
  );

  const getItemQtyMeta = useCallback(
    (_sourceItemId: string) => {
      const item = items.find((it) => it.sourceItemId === _sourceItemId);
      return {
        packingSize: item?.unitPerPacking || 1,
        quantityType: DEFAULT_NEW_GRN_QUANTITY_TYPE,
      };
    },
    [items],
  );

  const toInvoiceDisplayQty = useCallback(
    (sourceItemId: string, baseQty: number) => {
      const { packingSize, quantityType } = getItemQtyMeta(sourceItemId);
      return round2(
        fromBaseQuantity({
          baseQty,
          quantityType,
          packingSize,
        }),
      );
    },
    [getItemQtyMeta],
  );

  const toInvoiceBaseQty = useCallback(
    (sourceItemId: string, displayQty: number) => {
      const { packingSize, quantityType } = getItemQtyMeta(sourceItemId);
      try {
        return Math.round(
          toBaseQuantity({
            quantity: displayQty,
            quantityType,
            packingSize,
          }),
        );
      } catch {
        return 0;
      }
    },
    [getItemQtyMeta],
  );

  /** Remaining received qty available to allocate across invoice batch rows. */
  const getRemainingInvoiceQty = useCallback(
    (sourceItemId: string, excludeRowId?: string) => {
      const received = getReceivedQtyForProduct(sourceItemId);
      const used = manualRows
        .filter((row) => row.sourceItemId === sourceItemId && row.id !== excludeRowId)
        .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      return round2(Math.max(0, received - used));
    },
    [getReceivedQtyForProduct, manualRows],
  );

  /** Keep invoice qty in sync with Order Items Summary received qty. */
  const syncInvoiceQtyFromReceived = useCallback(
    (sourceItemId: string, receivedQty: number, currentRows?: ManualInvoiceRow[]) => {
      const rows = currentRows ?? manualRows;
      const productRows = rows.filter((row) => row.sourceItemId === sourceItemId);
      if (productRows.length === 0) return rows;
      const { packingSize, quantityType } = (() => {
        const item = items.find((it) => it.sourceItemId === sourceItemId);
        return {
          packingSize: item?.unitPerPacking || 1,
          quantityType: DEFAULT_NEW_GRN_QUANTITY_TYPE,
        };
      })();

      return rows.map((row) => {
        if (row.sourceItemId !== sourceItemId) return row;

        let nextQty = row.quantity;
        if (productRows.length === 1) {
          nextQty = receivedQty;
        } else if (row.id === productRows[0].id) {
          const othersSum = productRows
            .slice(1)
            .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
          nextQty = Math.max(0, round2(receivedQty - othersSum));
        }

        const displayQty = round2(
          fromBaseQuantity({
            baseQty: nextQty,
            quantityType,
            packingSize,
          }),
        );
        const amounts = calcAmounts(nextQty, row.unitPrice, row.gstPct);
        return { ...row, quantity: nextQty, displayQty, ...amounts };
      });
    },
    [manualRows, items],
  );

  const resetDependentOnSupplier = () => {
    setSelectedPoId("");
    setWarehouseId("");
    setItems([]);
    setManualRows([createEmptyRow()]);
    setInvoiceNumber("");
    setItemErrors({});
    setItemWarnings({});
    setExtractionWarnings([]);
    setExtractionErrors([]);
    setSupplierMatch(null);
    setUnmatchedSupplier(null);
    setExtractedInvoiceItems([]);
    setFormError(null);
  };

  const resetDependentOnPo = () => {
    setWarehouseId("");
    setItems([]);
    setManualRows([createEmptyRow()]);
    setInvoiceNumber("");
    setItemErrors({});
    setItemWarnings({});
    setExtractionWarnings([]);
    setExtractionErrors([]);
    setSupplierMatch(null);
    setUnmatchedSupplier(null);
    setExtractedInvoiceItems([]);
    setFormError(null);
  };

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    resetDependentOnSupplier();
  };

  const handlePoChange = (value: string) => {
    setSelectedPoId(value);
    resetDependentOnPo();
  };

  const handleItemQtyChange = (
    sourceItemId: string,
    field: "quantity" | "quantityType",
    val: string,
  ) => {
    const key = itemKey(sourceItemId);

    // PO GRN quantity type is locked to Case.
    if (field === "quantityType") return;

    setItems((prev) => {
      const next = prev.map((it) => {
        if (it.sourceItemId !== sourceItemId) return it;
        const packingSize = it.unitPerPacking || 1;
        const quantityType = DEFAULT_NEW_GRN_QUANTITY_TYPE;
        const displayQty = Math.max(0, parseFloat(val) || 0);

        let receivedQty = 0;
        try {
          receivedQty = round2(
            toBaseQuantity({
              quantity: displayQty,
              quantityType,
              packingSize,
            }),
          );
        } catch {
          receivedQty = 0;
        }

        return {
          ...it,
          quantityType,
          displayQty,
          receivedQty,
          pendingQty: Math.max(0, round2((it.maxReceivableQty ?? 0) - receivedQty)),
          receivedCases: displayQty,
          receivedLooseQty: 0,
        };
      });

      const target = next.find((it) => it.sourceItemId === sourceItemId);
      if (target) {
        const maxReceivable = target.maxReceivableQty ?? target.pendingQty ?? 0;
        const packingSize = target.unitPerPacking || 1;
        setItemWarnings((w) => {
          const copy = { ...w };
          if (target.receivedQty > maxReceivable) {
            copy[key] =
              `Current received (${formatQtyStackInline(itemQtyStack(target.receivedQty, target))}) exceeds pending (${formatQtyStackInline(itemQtyStack(maxReceivable, target))}).`;
          } else {
            delete copy[key];
          }
          return copy;
        });
        setItemErrors((e) => {
          const copy = { ...e };
          if (target.receivedQty < 0) {
            copy[key] = "Quantity cannot be negative";
          } else if (!(packingSize > 0)) {
            copy[key] = "Packing size is required for CASE quantity type";
          } else {
            delete copy[key];
          }
          return copy;
        });

        setManualRows((rows) =>
          syncInvoiceQtyFromReceived(sourceItemId, target.receivedQty, rows),
        );
      }

      return next;
    });
    setFormError(null);
  };

  const applyProductToRow = (
    row: ManualInvoiceRow,
    sourceItemId: string,
    allRows: ManualInvoiceRow[],
  ): ManualInvoiceRow => {
    const line = poLines.find((l) => (l.purchaseOrderProductId || l.uid) === sourceItemId);
    if (!line) {
      return {
        ...row,
        sourceItemId: "",
        productId: "",
        productName: "",
        productCode: "",
        unit: "",
        unitPrice: 0,
        gstPct: 0,
        gstAmount: 0,
        totalAmount: 0,
        displayQty: 0,
        quantity: 0,
      };
    }

    const gstPct = getLineGstPct(line);
    const lineId = line.purchaseOrderProductId || line.uid;
    const received = getReceivedQtyForProduct(lineId);
    const usedByOthers = allRows
      .filter((r) => r.sourceItemId === lineId && r.id !== row.id)
      .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const autofillQty = row.quantity > 0 ? row.quantity : Math.max(0, round2(received - usedByOthers));
    const displayQty = row.displayQty > 0 ? row.displayQty : toInvoiceDisplayQty(lineId, autofillQty);
    const unitPrice = row.unitPrice > 0 ? row.unitPrice : line.unitPrice;
    const amounts = calcAmounts(autofillQty, unitPrice, gstPct);
    const qtyMeta = getItemQtyMeta(lineId);

    return {
      ...row,
      sourceItemId: lineId,
      productId: String(line.productId || ""),
      productName: line.productName,
      productCode: line.sku || line.productCode,
      unit:
        qtyMeta.quantityType === "CASE"
          ? line.packagingUnit || "Case"
          : line.baseUnit || line.uom || "Unit",
      unitPrice,
      gstPct,
      displayQty,
      quantity: autofillQty,
      ...amounts,
    };
  };

  const updateRow = (rowId: string, patch: Partial<ManualInvoiceRow>) => {
    setManualRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let next = { ...row, ...patch };
        if (patch.sourceItemId !== undefined) {
          next = applyProductToRow(next, patch.sourceItemId, prev);
        }
        if (patch.displayQty !== undefined && patch.sourceItemId === undefined) {
          const sourceItemId = next.sourceItemId;
          const baseQty = sourceItemId
            ? toInvoiceBaseQty(sourceItemId, patch.displayQty)
            : patch.displayQty;
          next = {
            ...next,
            displayQty: Math.max(0, patch.displayQty),
            quantity: Math.max(0, baseQty),
          };
        }
        if (
          patch.quantity !== undefined &&
          patch.displayQty === undefined &&
          patch.sourceItemId === undefined
        ) {
          const sourceItemId = next.sourceItemId;
          const displayQty = sourceItemId
            ? toInvoiceDisplayQty(sourceItemId, patch.quantity)
            : patch.quantity;
          next = {
            ...next,
            quantity: Math.max(0, patch.quantity),
            displayQty: Math.max(0, displayQty),
          };
        }
        if (
          patch.displayQty !== undefined ||
          patch.quantity !== undefined ||
          patch.unitPrice !== undefined ||
          patch.gstPct !== undefined ||
          patch.sourceItemId !== undefined
        ) {
          const amounts = calcAmounts(next.quantity, next.unitPrice, next.gstPct);
          next = { ...next, ...amounts };
        }
        return next;
      }),
    );
    setFormError(null);
  };

  const addRow = () => {
    setManualRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setManualRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const handleInvoiceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setInvoiceFiles(files);
    setExtractionWarnings([]);
    setExtractionErrors([]);
    setSupplierMatch(null);
    setUnmatchedSupplier(null);
    setExtractedInvoiceItems([]);
    setFormError(null);
    // allow re-selecting the same file
    e.target.value = "";
  };

  const buildRowsFromExtraction = useCallback(
    (result: InvoiceExtractionResult): ManualInvoiceRow[] => {
      const sourceItems =
        result.items.length > 0 ? result.items : [null];

      // Match each extracted item to a PO line by SKU only (never by row order).
      const matchedLineIds: Array<string | null> = sourceItems.map((item) => {
        if (!item) return null;
        const matched = matchExtractedItemToPoLine(item, poLines);
        const lineId = matched ? getPoLineId(matched) : "";
        return lineId || null;
      });

      const isKanBiosys = /kan\s*biosys/i.test(result.supplier_name || "");

      return sourceItems.map((item, index) => {
        const lineId = matchedLineIds[index] || "";
        const line = poLines.find((l) => getPoLineId(l) === lineId);

        const baseRow = createEmptyRow();
        const withProduct = lineId
          ? applyProductToRow(baseRow, lineId, [])
          : {
            ...baseRow,
            productName: item?.product_name || "",
            productCode: item?.sku || "",
          };

        let displayQty = 0;
        let quantity = 0;
        let unitPrice = 0;
        let gstPct = 0;
        let amounts;

        if (isKanBiosys) {
          const displayQtyRaw =
            item?.bag_case_quantity ?? item?.total_quantity ?? 0;
          displayQty = Math.max(0, Number(displayQtyRaw) || 0);

          quantity = lineId
            ? toInvoiceBaseQty(lineId, displayQty)
            : displayQty;

          unitPrice = line ? line.unitPrice : withProduct.unitPrice;
          gstPct = line ? getLineGstPct(line) : withProduct.gstPct;
          amounts = calcAmounts(quantity, unitPrice, gstPct);
        } else {
          // Trust invoice numbers directly for other suppliers
          const displayQtyRaw =
            item?.bag_case_quantity ?? item?.total_quantity ?? withProduct.displayQty;
          displayQty = Math.max(0, Number(displayQtyRaw) || 0);

          quantity =
            item?.total_quantity != null && Number.isFinite(item.total_quantity)
              ? Math.max(0, item.total_quantity)
              : lineId
                ? toInvoiceBaseQty(lineId, displayQty)
                : displayQty;

          const extractedTaxable =
            item?.amount != null && Number.isFinite(item.amount)
              ? Math.max(0, item.amount)
              : null;
          const derivedUnitPrice =
            extractedTaxable != null &&
              quantity > 0 &&
              Number.isFinite(quantity)
              ? round2(extractedTaxable / quantity)
              : null;
          unitPrice =
            derivedUnitPrice != null
              ? derivedUnitPrice
              : item?.price != null && Number.isFinite(item.price)
                ? item.price
                : withProduct.unitPrice;
          gstPct =
            item?.gst_percentage != null && Number.isFinite(item.gst_percentage)
              ? item.gst_percentage
              : withProduct.gstPct;
          amounts =
            extractedTaxable != null
              ? {
                gstAmount: round2((extractedTaxable * gstPct) / 100),
                totalAmount: round2(
                  extractedTaxable + (extractedTaxable * gstPct) / 100,
                ),
              }
              : calcAmounts(quantity, unitPrice, gstPct);
        }

        return {
          ...withProduct,
          // Prefer PO SKU after match; otherwise keep extracted invoice SKU.
          productCode: lineId
            ? withProduct.productCode || item?.sku || ""
            : item?.sku || withProduct.productCode,
          batchNumber: item?.batch_number || "",
          mfgDate: normalizeExtractionDate(item?.mfg_date),
          expDate: normalizeExtractionDate(item?.exp_date),
          displayQty,
          quantity,
          unitPrice,
          gstPct,
          ...amounts,
        };
      });
    },
    // applyProductToRow / toInvoiceBaseQty close over latest state via callbacks below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poLines, items],
  );

  const applyExtractionResult = useCallback(
    (result: InvoiceExtractionResult) => {
      const blocked =
        result.success === false || result.supplier_match === false;

      setExtractionWarnings(result.warnings ?? []);
      setExtractionErrors(
        result.errors?.length
          ? result.errors
          : blocked
            ? [
              result.warnings?.[0] ||
              "Supplier on invoice does not match the selected Purchase Order.",
            ]
            : [],
      );
      setSupplierMatch(
        typeof result.supplier_match === "boolean"
          ? result.supplier_match
          : null,
      );
      setUnmatchedSupplier(result.unmatched_supplier ?? null);

      if (blocked) {
        // Do not apply invoice fields / line items when supplier does not match
        setExtractedInvoiceItems([]);
        setFormError(
          result.errors?.[0] ||
          result.warnings?.[0] ||
          "Supplier on invoice does not match the selected Purchase Order.",
        );
        return;
      }

      if (result.invoice_number) {
        setInvoiceNumber(result.invoice_number);
      }
      const parsedDate = normalizeExtractionDate(result.invoice_date);
      if (parsedDate) {
        setInvoiceDate(parsedDate);
      }

      // Freeze OCR values for PO invoice items before user edits Manual Invoice Entry
      setExtractedInvoiceItems(buildExtractedInvoiceItemsSnapshot(result, poLines));

      const nextRows = buildRowsFromExtraction(result);
      setManualRows(nextRows.length > 0 ? nextRows : [createEmptyRow()]);
      setFormError(null);
    },
    [buildRowsFromExtraction, poLines],
  );

  const handleExtractInvoice = async () => {
    if (!selectedPoId) {
      setFormError("Select a purchase order before extracting an invoice.");
      return;
    }
    if (invoiceFiles.length === 0) {
      setFormError("Please upload an invoice file first.");
      return;
    }

    const file = invoiceFiles[0];
    setFormError(null);
    setExtractionErrors([]);
    setExtractionWarnings([]);
    setSupplierMatch(null);
    setUnmatchedSupplier(null);

    try {
      const result = await extractInvoiceMutation.mutateAsync({
        file,
        purchaseOrderId: selectedPoId,
      });
      applyExtractionResult(result);
      if (result.success === false || result.supplier_match === false) {
        showToast(
          result.errors?.[0] ||
          result.warnings?.[0] ||
          "Supplier on invoice does not match the selected Purchase Order.",
          "error",
        );
      } else {
        showToast(
          result.warnings?.length
            ? "Invoice extracted with warnings. Review fields below."
            : "Invoice extracted successfully.",
          "success",
        );
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to extract invoice.");
      setFormError(message);
      showToast(message, "error");
    }
  };

  const handleSubmit = async (options?: { skipPartialWarning?: boolean }) => {
    setFormError(null);

    if (grnDateError) {
      setFormError(grnDateError);
      return;
    }
    if (invoiceDateError) {
      setFormError(invoiceDateError);
      return;
    }

    if (!supplierId) {
      setFormError("Please select a supplier.");
      return;
    }
    if (!selectedPoId) {
      setFormError("Please select a Purchase Order.");
      return;
    }
    if (!warehouseId) {
      setFormError("Please select a warehouse.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError("Invoice Number is required.");
      return;
    }
    if (!invoiceDate) {
      setFormError("Invoice Date is required.");
      return;
    }
    if (supplierMatch === false) {
      setFormError(
        extractionErrors[0] ||
        "Supplier on invoice does not match the selected Purchase Order.",
      );
      return;
    }

    const receivedItems = items.filter((it) => it.receivedQty > 0);
    if (receivedItems.length === 0) {
      setFormError("Enter at least one received quantity greater than 0.");
      return;
    }

    for (const it of receivedItems) {
      if (it.quantityType === "CASE" && !(it.unitPerPacking && it.unitPerPacking > 0)) {
        setFormError(
          `Packing size is missing or invalid for ${it.productName}. Cannot use CASE quantity type.`,
        );
        return;
      }
      const entryQty = Number(it.displayQty ?? it.receivedCases ?? 0);
      if (exceedsMaxLineQty(entryQty)) {
        setFormError(
          `${it.productName}: ${maxLineQtyMessage("Received quantity")}`,
        );
        return;
      }
      const pending = it.maxReceivableQty ?? it.pendingQty ?? 0;
      if (it.receivedQty > pending) {
        setFormError(
          `Received qty for ${it.productName} (${formatQtyStackInline(itemQtyStack(it.receivedQty, it))}) exceeds pending (${formatQtyStackInline(itemQtyStack(pending, it))}).`,
        );
        return;
      }
    }

    const filledRows = manualRows.filter(
      (row) =>
        row.sourceItemId ||
        row.batchNumber.trim() ||
        row.mfgDate ||
        row.expDate ||
        row.quantity > 0 ||
        row.displayQty > 0,
    );

    if (filledRows.length === 0) {
      setFormError("Add at least one invoice line with product and batch details.");
      return;
    }

    for (const row of filledRows) {
      const err = validateManualRow(row);
      if (err) {
        setFormError(err);
        return;
      }
    }

    const rowErrors: Record<string, string> = {};
    for (const row of filledRows) {
      const remainingForRow = getRemainingInvoiceQty(row.sourceItemId, row.id);
      if (round2(row.quantity) > round2(remainingForRow)) {
        const item = items.find((it) => it.sourceItemId === row.sourceItemId);
        rowErrors[row.id] = item
          ? `Quantity exceeds remaining received (${formatQtyStackInline(itemQtyStack(remainingForRow, item))}).`
          : `Quantity exceeds remaining received qty (${remainingForRow}).`;
      }
    }

    for (const it of receivedItems) {
      const batchSum = filledRows
        .filter((row) => row.sourceItemId === it.sourceItemId)
        .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      if (round2(batchSum) !== round2(it.receivedQty)) {
        setFormError(
          `Batch invoice qty for ${it.productName} (${formatQtyStackInline(itemQtyStack(batchSum, it))}) must equal current received qty (${formatQtyStackInline(itemQtyStack(it.receivedQty, it))}).`,
        );
        return;
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      setItemErrors(rowErrors);
      setFormError("Fix invalid quantities in Manual Invoice Entry before saving.");
      return;
    }
    setItemErrors({});

    // Warning only: product-wise partial GRN when GRN qty < applicable qty.
    if (!options?.skipPartialWarning) {
      const partialRows: PartialGrnProductRow[] = [];
      for (const it of items) {
        const applicableBase = round2(it.maxReceivableQty ?? 0);
        const grnBase = round2(it.receivedQty || 0);
        if (!(applicableBase > 0) || !(grnBase < applicableBase)) continue;
        const pendingBase = round2(Math.max(0, applicableBase - grnBase));
        partialRows.push({
          productName: it.productName,
          productCode: it.productCode || undefined,
          orderedQtyLabel: formatQtyStackInline(itemQtyStack(applicableBase, it)),
          grnQtyLabel: formatQtyStackInline(itemQtyStack(grnBase, it)),
          pendingQtyLabel: formatQtyStackInline(itemQtyStack(pendingBase, it)),
        });
      }
      if (partialRows.length > 0) {
        setPartialProducts(partialRows);
        setPartialConfirmOpen(true);
        return;
      }
    }

    setPartialConfirmOpen(false);
    setPartialProducts([]);

    const payloadItems = receivedItems.map((it) => {
      const line = poLines.find((l) => l.purchaseOrderProductId === it.sourceItemId);
      if (!line || !line.purchaseOrderProductId) {
        throw new Error("Invalid purchase order product selection.");
      }
      const exclude = isEdit
        ? thisGrnQtyBySourceItem.get(line.purchaseOrderProductId) ?? 0
        : 0;
      const ordered = line.orderedQty;
      const previous = Math.max(0, round2(getAlreadyReceivedBase(line) - exclude));
      const pending = getPendingBase(line, exclude);
      const batches = filledRows
        .filter((row) => row.sourceItemId === it.sourceItemId)
        .map((row) => ({
          batchNumber: row.batchNumber.trim(),
          invoiceNumber: invoiceNumber.trim(),
          manufactureDate: row.mfgDate || null,
          expiryDate: row.expDate || null,
          quantity_base_qty: row.quantity,
          rate: row.unitPrice,
          gst: row.gstPct,
          gstAmount: row.gstAmount,
        }));

      return {
        source_item_id: line.purchaseOrderProductId,
        ordered_base_qty: ordered,
        previous_received_base_qty: previous,
        current_received_base_qty: it.receivedQty,
        pending_base_qty: Math.max(0, round2(pending - it.receivedQty)),
        quantity_type: DEFAULT_NEW_GRN_QUANTITY_TYPE,
        productSnapshot: {
          product_id: String(line.productId || ""),
          product_code: line.productCode || line.sku,
          product_name: line.productName,
          sku: line.sku || line.productCode,
          base_unit: line.baseUnit || line.uom,
          packing_unit: line.packagingUnit,
          unit_per_packing: it.unitPerPacking || line.conversionQty || 1,
          conversion_qty: line.conversionQty || it.unitPerPacking || 1,
          pack_size: line.packSize ?? it.packSize,
          net_weight: it.netWeightPerPack ?? line.netWeightPerPack,
          gst_percent: getLineGstPct(line),
        },
        batches,
      };
    });

    try {
      setIsSubmitting(true);
      if (isEdit && grnId) {
        const updatePayload: UpdateGrnPayload = {
          supplierId,
          warehouseId,
          grnDate,
          items: payloadItems,
          invoices: [
            {
              invoiceNumber: invoiceNumber.trim(),
              invoiceDate,
              extractedItems: extractedInvoiceItems,
            },
          ],
        };
        await updateGrnMutation.mutateAsync({
          id: grnId,
          input: updatePayload,
          invoiceFiles,
        });
        setPartialConfirmOpen(false);
        setPartialProducts([]);
        showToast("GRN updated successfully.", "success");
        router.push(`/warehouse/grn/purchase/${grnId}`);
      } else {
        const payload: CreateGrnPayload = {
          source_id: selectedPoId,
          source_type: "PURCHASE_ORDER",
          supplierId,
          warehouseId,
          grnDate,
          items: payloadItems,
          invoices: [
            {
              invoiceNumber: invoiceNumber.trim(),
              invoiceDate,
              extractedItems: extractedInvoiceItems,
            },
          ],
        };
        await createGrnMutation.mutateAsync({ input: payload, invoiceFiles });
        setPartialConfirmOpen(false);
        setPartialProducts([]);
        showToast("GRN created successfully.", "success");
        router.push("/warehouse/grn/purchase");
      }
    } catch (err) {
      const message = getApiErrorMessage(
        err,
        isEdit ? "Failed to update GRN. Please try again." : "Failed to create GRN. Please try again.",
      );

      // Stale preview number: refresh from API so user can resubmit with a free number.
      if (
        !isEdit &&
        /grn number .+ already exists/i.test(message)
      ) {
        try {
          const { data: nextNumber } = await refetchPreviewNumber();
          if (nextNumber) {
            setGrnNo(nextNumber);
            const refreshedMsg = `${message} A new GRN number (${nextNumber}) has been loaded. Please submit again.`;
            setFormError(refreshedMsg);
            showToast(refreshedMsg, "error");
            return;
          }
        } catch {
          // Fall through to the original error if preview refresh fails.
        }
      }

      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierLabel =
    supplierOptions.find((s) => s.value === supplierId)?.label || "";
  const isBusy =
    isSubmitting || createGrnMutation.isPending || updateGrnMutation.isPending;
  const backHref = isEdit && grnId
    ? `/warehouse/grn/purchase/${grnId}`
    : "/warehouse/grn/purchase";

  const poSelectOptions = useMemo(() => {
    const options = poOptions.map((po) => ({
      value: po.purchase_order_id,
      label: po.po_no,
    }));
    if (
      selectedPoId &&
      !options.some((o) => o.value === selectedPoId) &&
      (existingGrn?.poNumber || selectedPo?.poNumber)
    ) {
      options.unshift({
        value: selectedPoId,
        label: existingGrn?.poNumber || selectedPo?.poNumber || selectedPoId,
      });
    }
    return options;
  }, [poOptions, selectedPoId, existingGrn?.poNumber, selectedPo?.poNumber]);

  if (isEdit && grnLoading) {
    return (
      <FormContainer
        title="Edit GRN"
        description="Loading GRN details…"
        onBack={() => router.push("/warehouse/grn/purchase")}
        onCancel={() => router.push("/warehouse/grn/purchase")}
      >
        <p className="text-xs text-muted-foreground text-center py-8">Loading GRN…</p>
      </FormContainer>
    );
  }

  if (isEdit && (grnError || !existingGrn)) {
    return (
      <FormContainer
        title="Edit GRN"
        description="Unable to load GRN for editing."
        onBack={() => router.push("/warehouse/grn/purchase")}
        onCancel={() => router.push("/warehouse/grn/purchase")}
      >
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {grnLoadError instanceof Error
            ? grnLoadError.message
            : "GRN not found or could not be loaded."}
        </div>
      </FormContainer>
    );
  }

  if (isEdit && existingGrn?.status === "qc_completed") {
    return (
      <FormContainer
        title="Edit GRN"
        description="Editing is restricted after QC completion."
        onBack={() => router.push(backHref)}
        onCancel={() => router.push(backHref)}
      >
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          This GRN cannot be edited because QC is already completed.
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={isEdit ? "Edit Purchase GRN" : "Generate GRN"}
      description={
        isEdit
          ? "Update received quantities and batch details for this purchase GRN. Supplier and PO cannot be changed."
          : "Capture physical goods receipt and batch details against a single purchase order. Upload an invoice to auto-fill header and batch rows."
      }
      onBack={() => router.push(backHref)}
      onCancel={() => router.push(backHref)}
      actions={
        <Button
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={() => {
            void handleSubmit();
          }}
          disabled={isBusy}
        >
          <Send className="w-3.5 h-3.5" />
          {isBusy
            ? isEdit
              ? "Updating…"
              : "Submitting…"
            : isEdit
              ? "Update GRN"
              : "Submit GRN"}
        </Button>
      }
    >
      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {formError}
        </div>
      )}

      <SectionCard
        title="Supplier & PO Selection"
        description="Select supplier first, then choose one approved purchase order with pending quantities."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TextField
            label="GRN Number"
            value={grnNo}
            placeholder="Auto-generated"
            readOnly
            className="h-9 text-xs font-mono font-bold bg-muted/30 placeholder:text-muted-foreground/50 placeholder:font-normal"
          />

          <Field label="Supplier" required>
            <AutocompleteSelect
              options={supplierOptions.map((s) => ({ value: s.value, label: s.label }))}
              value={supplierId}
              onChange={handleSupplierChange}
              placeholder={suppliersLoading ? "Loading suppliers…" : "Select supplier…"}
              searchPlaceholder="Search vendor…"
              disabled={suppliersLoading || isEdit}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field
            label="Select Purchase Order"
            required
            hint={
              !isEdit && supplierId && !posLoading && poOptions.length === 0
                ? "No purchase orders found for this supplier."
                : undefined
            }
          >
            <AutocompleteSelect
              options={poSelectOptions}
              value={selectedPoId}
              onChange={handlePoChange}
              placeholder={
                !supplierId
                  ? "Select supplier first…"
                  : posLoading
                    ? "Loading POs…"
                    : "Select PO…"
              }
              searchPlaceholder="Search PO…"
              disabled={!supplierId || posLoading || isEdit}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field label="Warehouse Destination" required>
            <AutocompleteSelect
              options={warehouseSelectOptions}
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={
                !supplierId ? "Select supplier first…" : "Select warehouse…"
              }
              searchPlaceholder="Search warehouse…"
              disabled={!supplierId}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <TextField
            label="GRN Date"
            type="date"
            value={grnDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrnDate(e.target.value)}
            className="h-9 text-xs"
            max={todayStr}
            min={invoiceDate}
            error={grnDateError}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Order Items Summary"
        description="Qty in Case is entered; Qty in Unit and Qty in Kg/Ltr are auto-calculated from product packing size."
      >
        {!selectedPoId ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a supplier and a purchase order to view order items.
          </p>
        ) : poDetailsLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading purchase order details…</p>
        ) : poDetailsError ? (
          <p className="text-xs text-red-600 text-center py-4">Failed to load purchase order details.</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No pending quantities remain on this purchase order.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">PO No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[180px]">Product</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Ordered</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Prev. Received</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Pending</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[120px] min-w-[120px]">
                      Qty in Case
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[100px] min-w-[100px]">
                      Qty in Unit
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[110px] min-w-[110px]">
                      Qty in Kg/Ltr
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const key = itemKey(it.sourceItemId);
                    const err = itemErrors[key];
                    const warn = itemWarnings[key];
                    const orderedStack = itemQtyStack(it.orderedQty, it);
                    const prevStack = itemQtyStack(it.alreadyReceivedQty ?? 0, it);
                    const pendingStack = itemQtyStack(it.pendingQty ?? 0, it);
                    const receivedStack = itemQtyStack(it.receivedQty, it);
                    return (
                      <tr key={`${key}-${idx}`} className="border-b border-border/50">
                        <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700 align-middle">{it.poNumber}</td>
                        <td className="px-3 py-2 align-middle min-w-[180px]">
                          <ProductSkuCell name={it.productName} sku={it.productCode} />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <StackedQtyCell stack={orderedStack} empty={!(it.orderedQty > 0)} />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <StackedQtyCell stack={prevStack} empty={!(it.alreadyReceivedQty)} />
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <StackedQtyCell
                            stack={pendingStack}
                            empty={!(it.pendingQty)}
                            className="[&_p:first-child]:text-amber-700"
                          />
                        </td>
                        <td className="px-3 py-2 align-middle w-[120px] min-w-[120px]">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              value={
                                (it.displayQty ?? 0) === 0 ? "" : it.displayQty
                              }
                              placeholder={GRN_QTY_PLACEHOLDER}
                              onChange={(e) =>
                                handleItemQtyChange(it.sourceItemId, "quantity", e.target.value)
                              }
                              className={cn(
                                GRN_QTY_INPUT_CLASSNAME,
                                err && "border-red-400",
                                warn && !err && "border-amber-400",
                              )}
                            />
                            {err && (
                              <p className="text-[10px] text-red-500 leading-tight flex items-start gap-0.5">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{err}</span>
                              </p>
                            )}
                            {warn && !err && (
                              <p className="text-[10px] text-amber-700 leading-tight flex items-start gap-0.5">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{warn}</span>
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold tabular-nums align-middle">
                          {it.receivedQty > 0 ? formatStackNum(receivedStack.unitQty) : "0"}
                        </td>
                        <td className="px-3 py-2 text-center text-xs font-semibold tabular-nums align-middle">
                          {receivedStack.weightUom
                            ? `${receivedStack.weightQty != null ? formatStackNum(receivedStack.weightQty) : "0"} ${receivedStack.weightUom}`
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {(() => {
              const receivedTotals = sumGrnQtyStacks(
                items.map((it) => itemQtyStack(it.receivedQty, it)),
              );
              const orderedTotals = sumGrnQtyStacks(
                items.map((it) => itemQtyStack(it.orderedQty, it)),
              );
              return (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/20 px-4 py-2.5">
                  <p className="text-[11px] text-muted-foreground">
                    Showing <span className="font-medium text-foreground">{items.length}</span> items
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Ordered:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {formatStackNum(orderedTotals.caseQty)} Case · {formatStackNum(orderedTotals.unitQty)} Unit
                        {orderedTotals.kg > 0 ? ` · ${formatStackNum(orderedTotals.kg)} Kg` : ""}
                        {orderedTotals.ltr > 0 ? ` · ${formatStackNum(orderedTotals.ltr)} Ltr` : ""}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Received:{" "}
                      <span className="font-medium tabular-nums text-brand-700">
                        {formatStackNum(receivedTotals.caseQty)} Case · {formatStackNum(receivedTotals.unitQty)} Unit
                        {receivedTotals.kg > 0 ? ` · ${formatStackNum(receivedTotals.kg)} Kg` : ""}
                        {receivedTotals.ltr > 0 ? ` · ${formatStackNum(receivedTotals.ltr)} Ltr` : ""}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Upload Invoice(s)"
        description="Upload a PDF/JPG/PNG invoice, then extract details into Manual Invoice Entry below."
      >
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-lg bg-white text-xs font-medium text-foreground cursor-pointer hover:bg-muted/40 transition-colors",
              extractInvoiceMutation.isPending && "pointer-events-none opacity-70",
            )}
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Add invoice file(s)
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              multiple
              className="hidden"
              onChange={handleInvoiceFilesChange}
              disabled={extractInvoiceMutation.isPending}
            />
          </label>

          <Button
            type="button"
            className="h-9 text-xs gap-1.5"
            onClick={handleExtractInvoice}
            disabled={
              extractInvoiceMutation.isPending ||
              invoiceFiles.length === 0 ||
              !selectedPoId
            }
          >
            {extractInvoiceMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            {extractInvoiceMutation.isPending ? "Extracting…" : "Extract Invoice"}
          </Button>
        </div>

        {invoiceFiles.length > 0 && (
          <ul className="mt-2 space-y-1">
            {invoiceFiles.map((file) => (
              <li
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
              >
                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{file.name}</span>
                <span className="tabular-nums">
                  ({Math.max(1, Math.round(file.size / 1024))} KB)
                </span>
              </li>
            ))}
            {invoiceFiles.length > 1 && (
              <li className="text-[11px] text-amber-700">
                Multiple files selected — extraction uses the first file for now.
              </li>
            )}
          </ul>
        )}

        {!selectedPoId && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Select a purchase order first so extracted line items can be matched to PO products.
          </p>
        )}

        {extractionErrors.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 space-y-1">
            <p className="text-[11px] font-semibold text-red-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Supplier validation
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {extractionErrors.map((error) => (
                <li key={error} className="text-[11px] text-red-800">
                  {error}
                </li>
              ))}
            </ul>
            {unmatchedSupplier && (
              <p className="text-[11px] text-red-800 pt-1">
                Expected supplier: <span className="font-semibold">{unmatchedSupplier}</span>
              </p>
            )}
          </div>
        )}

        {supplierMatch === true && (
          <p className="mt-2 text-[11px] text-emerald-700">
            Invoice supplier matches the selected Purchase Order.
          </p>
        )}

        {extractionWarnings.length > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 space-y-1">
            <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Extraction warnings
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {extractionWarnings.map((warning) => (
                <li key={warning} className="text-[11px] text-amber-800">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Manual Invoice Entry"
        description="Enter invoice header and batch rows. Qty in Case is entered; Qty in Unit and Qty in Kg/Ltr are auto-calculated from packing size."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={addRow}
            disabled={!selectedPoId || poLines.length === 0}
          >
            <Plus className="w-3.5 h-3.5" /> Add Batch Row
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TextField
            label="Invoice Number"
            required
            value={invoiceNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceNumber(e.target.value)}
            placeholder="Enter invoice number"
            className="h-9 text-xs"
            disabled={!selectedPoId}
          />
          <TextField
            label="Invoice Date"
            required
            type="date"
            value={invoiceDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceDate(e.target.value)}
            className="h-9 text-xs"
            disabled={!selectedPoId}
            max={grnDate < todayStr ? grnDate : todayStr}
            error={invoiceDateError}
          />
          <TextField
            label="Supplier"
            value={supplierLabel || "—"}
            readOnly
            className="h-9 text-xs bg-muted"
            disabled={!selectedPoId}
          />
        </div>

        {!selectedPoId ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a purchase order to add invoice batch rows.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1600px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-[320px] min-w-[300px]">Product</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-[160px] min-w-[140px]">Batch No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-[160px] min-w-[150px]">MFG Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-[160px] min-w-[150px]">Expiry Date</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[110px] min-w-[100px]">Qty in Case</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[100px] min-w-[90px]">Qty in Unit</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[110px] min-w-[100px]">Qty in Kg/Ltr</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[110px] min-w-[100px]">Price</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[80px] min-w-[70px]">GST %</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[110px] min-w-[100px]">GST Amt</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-[120px] min-w-[110px]">Total</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row) => {
                    const qtyMeta = row.sourceItemId
                      ? getItemQtyMeta(row.sourceItemId)
                      : { packingSize: 1, quantityType: "CASE" as const };
                    const lineItem = items.find((it) => it.sourceItemId === row.sourceItemId);
                    const rowQtyStack = lineItem
                      ? itemQtyStack(row.quantity, lineItem)
                      : resolveGrnQtyStack(row.quantity, { packingSize: qtyMeta.packingSize });
                    const err = itemErrors[row.id];

                    const rowMfgError = row.mfgDate && row.mfgDate > todayStr ? "Cannot be in the future" : undefined;
                    const rowExpError = row.expDate && row.mfgDate && row.expDate <= row.mfgDate ? "Must be after MFG Date" : undefined;

                    return (
                      <tr key={row.id} className="border-b border-border/50 align-top">
                        <td className="px-3 py-2 w-[320px] min-w-[300px]">
                          <AutocompleteSelect
                            options={productOptions}
                            value={row.sourceItemId}
                            onChange={(val: string) => updateRow(row.id, { sourceItemId: val })}
                            placeholder="Select product…"
                            searchPlaceholder="Search product…"
                            disabled={productOptions.length === 0}
                            renderTriggerLabel={(selected) =>
                              Array.isArray(selected) ? null : (
                                <span className="truncate">{selected.label}</span>
                              )
                            }
                            className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
                          />
                          <p className="text-[11px] font-mono text-muted-foreground mt-1 truncate">
                            SKU: {row.productCode?.trim() ? row.productCode : "—"}
                          </p>

                        </td>
                        <td className="px-3 py-2 w-[160px] min-w-[140px]">
                          <Input
                            value={row.batchNumber}
                            onChange={(e) => updateRow(row.id, { batchNumber: e.target.value })}
                            placeholder="Batch no."
                            className="h-9 text-xs w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[160px] min-w-[150px]">
                          <Input
                            type="date"
                            value={row.mfgDate}
                            onChange={(e) => updateRow(row.id, { mfgDate: e.target.value })}
                            className={cn("h-9 text-xs w-full", rowMfgError && "border-red-400 focus-visible:ring-red-400")}
                            max={todayStr}
                          />
                          {rowMfgError && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-start gap-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                              <span>{rowMfgError}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[160px] min-w-[150px]">
                          <Input
                            type="date"
                            value={row.expDate}
                            onChange={(e) => updateRow(row.id, { expDate: e.target.value })}
                            className={cn("h-9 text-xs w-full", rowExpError && "border-red-400 focus-visible:ring-red-400")}
                            min={row.mfgDate}
                          />
                          {rowExpError && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-start gap-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                              <span>{rowExpError}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[110px] min-w-[100px]">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={row.displayQty === 0 ? "" : row.displayQty}
                            onChange={(e) =>
                              updateRow(row.id, {
                                displayQty: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            placeholder={GRN_QTY_PLACEHOLDER}
                            className={cn(
                              GRN_QTY_INPUT_CLASSNAME,
                              err && "border-red-400",
                            )}
                          />
                          {err && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-start gap-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                              <span>{err}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2 w-[100px] min-w-[90px]">
                          <Input
                            type="number"
                            readOnly
                            value={row.quantity === 0 ? "" : formatStackNum(rowQtyStack.unitQty)}
                            placeholder="0"
                            className="h-9 text-xs text-center tabular-nums bg-muted w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[110px] min-w-[100px]">
                          <Input
                            readOnly
                            value={
                              rowQtyStack.weightQty != null && rowQtyStack.weightUom
                                ? formatWeightQty(rowQtyStack.weightQty, rowQtyStack.weightUom)
                                : ""
                            }
                            placeholder="—"
                            className="h-9 text-xs text-center bg-muted w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[110px] min-w-[100px]">
                          <Input
                            readOnly
                            value={row.unitPrice ? row.unitPrice : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[80px] min-w-[70px]">
                          <Input
                            readOnly
                            value={row.gstPct ? row.gstPct : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[110px] min-w-[100px]">
                          <Input
                            readOnly
                            value={row.gstAmount ? row.gstAmount : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted w-full"
                          />
                        </td>
                        <td className="px-3 py-2 w-[120px] min-w-[110px]">
                          <Input
                            readOnly
                            value={row.totalAmount ? row.totalAmount : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums font-semibold bg-muted w-full"
                          />
                        </td>
                        <td className="px-2 py-2 w-10">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <PartialGrnConfirmDialog
        open={partialConfirmOpen}
        products={partialProducts}
        submitting={isBusy}
        onCancel={() => {
          setPartialConfirmOpen(false);
          setPartialProducts([]);
        }}
        onContinue={() => {
          void handleSubmit({ skipPartialWarning: true });
        }}
      />
    </FormContainer>
  );
}
