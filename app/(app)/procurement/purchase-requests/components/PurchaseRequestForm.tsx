"use client";

import React, { useMemo, useRef, useState } from "react";
import { Check, Download, Eye, Package, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { CURRENT_USER, DEPARTMENT_OPTIONS, PR_PRIORITY_OPTIONS } from "@/lib/procurement/config";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  calcPackingToBaseQty,
  calcPrLineAmount,
  enrichProductForProcurement,
  type PackagingUom,
} from "@/lib/procurement/procurement-line-utils";
import { stateSelectOptions, warehouseSelectOptions } from "@/lib/procurement/warehouse-filter";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { formatCurrency } from "@/lib/procurement/utils";
import { enrichPRLineItem, type PRAttachment, type PRLineItem, type PurchaseRequest } from "../pr-data";
import type { PRPriority } from "@/lib/procurement/config";

export interface PRFormValues {
  prDate: string;
  requestedBy: string;
  department: string;
  priority: PRPriority;
  state: string;
  warehouseId: number | null;
  warehouseName: string;
  requiredByDate: string;
  purpose: string;
  remarks: string;
  lines: PRLineItem[];
  attachments: PRAttachment[];
}

export function prToFormValues(pr: PurchaseRequest): PRFormValues {
  return {
    prDate: pr.prDate,
    requestedBy: pr.requestedBy,
    department: pr.department,
    priority: pr.priority,
    state: pr.state,
    warehouseId: pr.warehouseId,
    warehouseName: pr.warehouseName,
    requiredByDate: pr.requiredByDate,
    purpose: pr.purpose,
    remarks: pr.remarks,
    lines: pr.lines.map((l) => enrichPRLineItem({ ...l })),
    attachments: [...pr.attachments],
  };
}

export function emptyPRLine(): PRLineItem {
  return {
    uid: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: 0,
    productCode: "",
    productName: "",
    description: "",
    sku: "",
    baseUnit: "Unit",
    packagingUnit: "Box",
    conversionQty: 1,
    requestUom: "Unit",
    requestedQty: 1,
    totalQtyBase: 1,
    segment: "",
    category: "",
    hsnCode: "",
    mrp: 0,
    ratePerSku: 0,
    uom: "Unit",
    remarks: "",
  };
}

export const DEFAULT_PR_FORM: PRFormValues = {
  prDate: new Date().toISOString().slice(0, 10),
  requestedBy: CURRENT_USER,
  department: "procurement",
  priority: "medium",
  state: "",
  warehouseId: null,
  warehouseName: "",
  requiredByDate: "",
  purpose: "",
  remarks: "",
  lines: [],
  attachments: [],
};

function SectionHead({ label, sub, required }: { label: string; sub?: string; required?: boolean }) {
  return (
    <div className="mb-1.5 pb-1.5 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const inputCls = "h-8 rounded-lg text-xs";
const readOnlyCls = cn(inputCls, "bg-muted/30 text-foreground");

function ReadOnlyField({ value }: { value: string }) {
  return (
    <Input
      value={value || "—"}
      readOnly
      className={readOnlyCls}
    />
  );
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

interface InlineEditDraft {
  productId: string;
  packingQty: string;
  remarks: string;
}

function packagingUnitToRequestUom(packagingUnit: string): PackagingUom {
  const norm = packagingUnit.toLowerCase();
  if (norm.includes("case")) return "Case";
  if (norm.includes("box")) return "Box";
  if (norm.includes("carton")) return "Carton";
  return "Unit";
}

function lineFromProduct(productId: number, packingQty: number, remarks = ""): PRLineItem | null {
  const info = enrichProductForProcurement(productId);
  if (!info) return null;
  const requestedQty = packingQty;
  const requestUom = packagingUnitToRequestUom(info.packagingUnit);
  return {
    ...emptyPRLine(),
    productId: info.productId,
    productCode: info.productCode,
    productName: info.productName,
    description: info.description,
    sku: info.sku,
    baseUnit: info.baseUnit,
    packagingUnit: info.packagingUnit,
    conversionQty: info.conversionQty,
    requestUom,
    requestedQty,
    totalQtyBase: calcPackingToBaseQty(requestedQty, info.conversionQty),
    segment: info.segment,
    category: info.category,
    hsnCode: info.hsnCode,
    mrp: info.mrp,
    ratePerSku: info.ratePerSku,
    uom: requestUom,
    remarks,
  };
}

export function PurchaseRequestForm({
  form,
  onChange,
  readOnly,
  prNumber = "",
}: {
  form: PRFormValues;
  onChange: (f: PRFormValues) => void;
  readOnly?: boolean;
  prNumber?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const masterProducts = loadProducts().filter((p) => p.status === "active");
  const [quickProductIds, setQuickProductIds] = useState<string[]>([]);
  const [quickQty, setQuickQty] = useState("1");
  const [quickRemarks, setQuickRemarks] = useState("");
  const [inlineEditUid, setInlineEditUid] = useState<string | null>(null);
  const [inlineEditDraft, setInlineEditDraft] = useState<InlineEditDraft | null>(null);
  const [inlineEditError, setInlineEditError] = useState<string | null>(null);

  const stateOptions = useMemo(() => stateSelectOptions(), []);
  const warehouseOptions = useMemo(
    () => warehouseSelectOptions(form.state),
    [form.state],
  );

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) =>
    onChange({ ...form, [k]: v });

  const updateLine = (uid: string, patch: Partial<PRLineItem>) => {
    onChange({
      ...form,
      lines: form.lines.map((l) => {
        if (l.uid !== uid) return l;
        const next = { ...l, ...patch };
        next.totalQtyBase = calcPackingToBaseQty(next.requestedQty, next.conversionQty);
        next.uom = next.requestUom;
        return next;
      }),
    });
  };

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
    if (!packingQty || packingQty <= 0) {
      setInlineEditError("Packing qty is required and must be greater than 0");
      return;
    }
    const productId = Number(inlineEditDraft.productId);
    if (!productId) {
      setInlineEditError("Product is required");
      return;
    }
    const base = lineFromProduct(productId, packingQty, inlineEditDraft.remarks);
    if (!base) return;
    updateLine(inlineEditUid, {
      productId: base.productId,
      productCode: base.productCode,
      productName: base.productName,
      description: base.description,
      sku: base.sku,
      baseUnit: base.baseUnit,
      packagingUnit: base.packagingUnit,
      conversionQty: base.conversionQty,
      segment: base.segment,
      category: base.category,
      hsnCode: base.hsnCode,
      mrp: base.mrp,
      ratePerSku: base.ratePerSku,
      requestUom: base.requestUom,
      requestedQty: packingQty,
      remarks: inlineEditDraft.remarks,
    });
    cancelInlineEdit();
  };

  const quickAdd = () => {
    if (quickProductIds.length === 0) return;
    const packingQty = Number(quickQty) || 1;
    let nextLines = [...form.lines];
    for (const idStr of Array.from(new Set(quickProductIds))) {
      const productId = Number(idStr);
      const line = lineFromProduct(productId, packingQty, quickRemarks);
      if (!line) continue;
      const idx = nextLines.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        const existing = nextLines[idx];
        const nextPackingQty = existing.requestedQty + packingQty;
        nextLines[idx] = {
          ...existing,
          requestedQty: nextPackingQty,
          totalQtyBase: calcPackingToBaseQty(nextPackingQty, existing.conversionQty),
          remarks: quickRemarks || existing.remarks,
        };
      } else {
        nextLines.push({ ...line, uid: emptyPRLine().uid });
      }
    }
    onChange({ ...form, lines: nextLines });
    clearQuickFields();
  };

  const removeLine = (uid: string) => {
    onChange({ ...form, lines: form.lines.filter((l) => l.uid !== uid) });
    if (inlineEditUid === uid) cancelInlineEdit();
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({
      ...form,
      attachments: [
        ...form.attachments,
        {
          uid: `att-${Date.now()}`,
          name: file.name,
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          uploadedAt: new Date().toISOString().slice(0, 10),
          uploadedBy: CURRENT_USER,
        },
      ],
    });
    e.target.value = "";
  };

  const filledLines = form.lines.filter((l) => l.productId > 0);
  const totalPackingQty = filledLines.reduce((sum, l) => sum + (l.requestedQty || 0), 0);
  const totalSkuQty = filledLines.reduce((sum, l) => sum + (l.totalQtyBase || 0), 0);
  const totalAmount = filledLines.reduce(
    (sum, l) => sum + calcPrLineAmount(l.ratePerSku, l.totalQtyBase),
    0,
  );
  const previewProductId = Number(quickProductIds[0]);
  const previewProductInfo = previewProductId ? enrichProductForProcurement(previewProductId) : null;
  const previewSkuQty = previewProductInfo
    ? calcPackingToBaseQty(Number(quickQty) || 0, previewProductInfo.conversionQty)
    : 0;
  const previewAmount = previewProductInfo
    ? calcPrLineAmount(previewProductInfo.ratePerSku, previewSkuQty)
    : 0;
  const productOptions = masterProducts.map((p) => ({
    value: String(p.id),
    label: `${p.productName} (${p.sku || p.productId})`,
  }));

  const onStateChange = (state: string) => {
    onChange({
      ...form,
      state,
      warehouseId: null,
      warehouseName: "",
    });
  };

  const onWarehouseChange = (val: string) => {
    const wh = loadWarehouses().find((w) => String(w.id) === val);
    onChange({
      ...form,
      warehouseId: wh ? wh.id : null,
      warehouseName: wh?.warehouseName ?? "",
    });
  };

  const departmentLabel =
    DEPARTMENT_OPTIONS.find((d) => d.value === form.department)?.label ?? form.department;
  const priorityLabel =
    PR_PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label ?? form.priority;

  return (
    <div className={cn("rounded-xl border border-border bg-white p-4 shadow-sm", readOnly && "w-full")}>
      <div className="space-y-3">
        <div>
          <SectionHead label="Request Details" sub="Core purchase request information and required timeline." />
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs font-medium">PR No.</Label>
              <Input
                value={prNumber || "Auto-generated"}
                readOnly
                className={cn(inputCls, "bg-muted/30 font-mono text-muted-foreground")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">PR Date</Label>
              {readOnly ? (
                <ReadOnlyField value={formatDisplayDate(form.prDate)} />
              ) : (
                <Input
                  type="date"
                  value={form.prDate}
                  onChange={(e) => set("prDate", e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Requested By</Label>
              <Input
                value={form.requestedBy}
                readOnly
                className={cn(inputCls, "bg-muted/30 text-muted-foreground")}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Department</Label>
              {readOnly ? (
                <ReadOnlyField value={departmentLabel} />
              ) : (
                <AutocompleteSelect
                  options={DEPARTMENT_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                  value={form.department}
                  onChange={(v) => set("department", String(v))}
                  placeholder="Select department"
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Priority</Label>
              {readOnly ? (
                <ReadOnlyField value={priorityLabel} />
              ) : (
                <AutocompleteSelect
                  options={PR_PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
                  value={form.priority}
                  onChange={(v) => set("priority", v as PRPriority)}
                  placeholder="Select priority"
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">State</Label>
              {readOnly ? (
                <ReadOnlyField value={form.state} />
              ) : (
                <AutocompleteSelect
                  options={stateOptions}
                  value={form.state}
                  onChange={(v) => onStateChange(String(v))}
                  placeholder="Select state"
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Warehouse</Label>
              {readOnly ? (
                <ReadOnlyField value={form.warehouseName} />
              ) : (
                <AutocompleteSelect
                  options={warehouseOptions}
                  value={form.warehouseId ? String(form.warehouseId) : ""}
                  onChange={(v) => onWarehouseChange(String(v))}
                  disabled={!form.state}
                  placeholder={form.state ? "Select warehouse" : "Select state first"}
                  className={inputCls}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Required By Date</Label>
              {readOnly ? (
                <ReadOnlyField value={formatDisplayDate(form.requiredByDate)} />
              ) : (
                <Input
                  type="date"
                  value={form.requiredByDate}
                  onChange={(e) => set("requiredByDate", e.target.value)}
                  className={inputCls}
                />
              )}
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <Label className="text-xs font-medium">Purpose / Justification</Label>
            <Textarea
              rows={2}
              readOnly={readOnly}
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="Business justification for this purchase request..."
              className={cn(
                "min-h-[60px] rounded-lg text-xs",
                readOnly && "bg-muted/30 resize-none",
              )}
            />
          </div>
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
            <SectionHead
              label="Product / Item Details"
              sub="Enter packaging quantity — total SKU qty and amount are auto-calculated from product master."
            />
            <div className="flex flex-wrap items-center gap-2">
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

          {!readOnly && (
            <div className="mb-2 rounded-lg border border-border bg-muted/20 p-2.5">
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)_auto]">
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
              {previewProductInfo && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border/60 bg-white px-2.5 py-1.5 text-[11px]">
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
          )}

          {filledLines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-8 text-center">
              <Package className="mx-auto mb-1.5 h-9 w-9 text-muted-foreground/70" />
              <p className="text-sm font-semibold text-foreground">No items added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a product to start building this request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full min-w-[900px] table-fixed">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="w-[22%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                      Product
                    </th>
                    <th className="w-[10%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                      HSN Code
                    </th>
                    <th className="w-[12%] px-4 py-2.5 text-left text-xs font-semibold text-foreground">
                      Packaging Type
                    </th>
                    <th className="w-[10%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                      Quantity
                    </th>
                    <th className="w-[12%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                      Total SKU Qty
                    </th>
                    <th className="w-[12%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                      Rate / SKU
                    </th>
                    <th className="w-[14%] px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                      Total Amount
                    </th>
                    {!readOnly && (
                      <th className="w-16 px-4 py-2.5 text-right text-xs font-semibold text-foreground">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filledLines.map((line) => {
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
                          isEditing ? "bg-brand-50/60" : "hover:bg-muted/20",
                        )}
                      >
                        <td className="px-4 py-2">
                          {isEditing && draft ? (
                            <AutocompleteSelect
                              options={productOptions}
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
                        <td className="px-4 py-2 font-mono text-xs text-foreground">
                          {displayHsn || "—"}
                        </td>
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
                                <button
                                  type="button"
                                  title="Remove"
                                  onClick={() => removeLine(line.uid)}
                                  disabled={!!inlineEditUid}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-40"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
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
                  Showing{" "}
                  <span className="font-medium text-foreground">{filledLines.length}</span> of{" "}
                  <span className="font-medium text-foreground">{filledLines.length}</span> items
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    Total quantity:{" "}
                    <span className="font-medium text-foreground tabular-nums">{totalPackingQty}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Total SKU qty:{" "}
                    <span className="font-medium text-foreground tabular-nums">{totalSkuQty}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Total amount:{" "}
                    <span className="font-medium text-foreground tabular-nums font-mono">
                      {formatCurrency(totalAmount)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 pt-3">
          <SectionHead
            label="Remarks & Attachments"
            sub={readOnly ? undefined : "Additional notes and supporting documents."}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              {!readOnly && (
                <p className="mb-1.5 text-xs font-medium text-foreground">Remarks</p>
              )}
              <Textarea
                rows={4}
                readOnly={readOnly}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Optional remarks..."
                className={cn(
                  "min-h-[90px] rounded-lg text-xs",
                  readOnly && "bg-muted/30 resize-none",
                )}
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-2.5">
              {!readOnly && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">Attachments</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-[11px] font-semibold"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Add File
                  </Button>
                </div>
              )}
              {readOnly && (
                <p className="mb-2 text-xs font-medium text-foreground">Attachments</p>
              )}
              {!readOnly && <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />}
                {form.attachments.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                    No attachments
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {form.attachments.map((a) => (
                      <li
                        key={a.uid}
                        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
                      >
                        <span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
                        <span className="text-muted-foreground">{a.size}</span>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...form,
                                attachments: form.attachments.filter((x) => x.uid !== a.uid),
                              })
                            }
                            className="text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
