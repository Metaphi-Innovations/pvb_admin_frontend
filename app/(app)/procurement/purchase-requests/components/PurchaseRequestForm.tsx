"use client";

import React, { useMemo, useRef, useState } from "react";
import { Download, Eye, Package, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { CURRENT_USER, DEPARTMENT_OPTIONS, PR_PRIORITY_OPTIONS } from "@/lib/procurement/config";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  calcTotalQtyBase,
  enrichProductForProcurement,
  PACKAGING_UOM_OPTIONS,
  type PackagingUom,
} from "@/lib/procurement/procurement-line-utils";
import { stateSelectOptions, warehouseSelectOptions } from "@/lib/procurement/warehouse-filter";
import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import { formatCurrency } from "@/lib/procurement/utils";
import { ProductInfoStrip } from "@/components/procurement/ProductInfoStrip";
import type { PRAttachment, PRLineItem, PurchaseRequest } from "../pr-data";
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
    lines: pr.lines.map((l) => ({ ...l })),
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
    mrp: 0,
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
    <div className="mb-2.5 mt-0.5">
      <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const inputCls = "h-8 rounded-lg text-xs";

function lineFromProduct(productId: number, qty: number): PRLineItem | null {
  const info = enrichProductForProcurement(productId);
  if (!info) return null;
  const requestUom: PackagingUom = "Unit";
  const requestedQty = qty;
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
    totalQtyBase: calcTotalQtyBase(requestUom, requestedQty, info.conversionQty),
    segment: info.segment,
    category: info.category,
    mrp: info.mrp,
    uom: requestUom,
    remarks: "",
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
  const [expandedLineUid, setExpandedLineUid] = useState<string | null>(null);

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
        next.totalQtyBase = calcTotalQtyBase(next.requestUom, next.requestedQty, next.conversionQty);
        next.uom = next.requestUom;
        return next;
      }),
    });
  };

  const addProductLine = (productId: number, qty: number) => {
    const line = lineFromProduct(productId, qty);
    if (!line) return;
    const existing = form.lines.find((l) => l.productId === productId);
    if (existing) {
      updateLine(existing.uid, { requestedQty: existing.requestedQty + qty });
      return;
    }
    onChange({ ...form, lines: [...form.lines, { ...line, uid: emptyPRLine().uid }] });
  };

  const quickAdd = () => {
    if (quickProductIds.length === 0) return;
    const qty = Number(quickQty) || 1;
    let nextLines = [...form.lines];
    for (const idStr of Array.from(new Set(quickProductIds))) {
      const productId = Number(idStr);
      const line = lineFromProduct(productId, qty);
      if (!line) continue;
      const idx = nextLines.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        const existing = nextLines[idx];
        nextLines[idx] = {
          ...existing,
          requestedQty: existing.requestedQty + qty,
          totalQtyBase: calcTotalQtyBase(
            existing.requestUom,
            existing.requestedQty + qty,
            existing.conversionQty,
          ),
        };
      } else {
        nextLines.push({ ...line, uid: emptyPRLine().uid });
      }
    }
    onChange({ ...form, lines: nextLines });
    setQuickProductIds([]);
    setQuickQty("1");
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

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="space-y-5">
        <div>
          <SectionHead label="Request Details" sub="Core purchase request information and required timeline." />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
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
              <Input
                type="date"
                disabled={readOnly}
                value={form.prDate}
                onChange={(e) => set("prDate", e.target.value)}
                className={inputCls}
              />
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
              <AutocompleteSelect
                options={DEPARTMENT_OPTIONS.map((d) => ({ value: d.value, label: d.label }))}
                value={form.department}
                onChange={(v) => set("department", String(v))}
                disabled={readOnly}
                placeholder="Select department"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Priority</Label>
              <AutocompleteSelect
                options={PR_PRIORITY_OPTIONS.map((p) => ({ value: p.value, label: p.label }))}
                value={form.priority}
                onChange={(v) => set("priority", v as PRPriority)}
                disabled={readOnly}
                placeholder="Select priority"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">State</Label>
              <AutocompleteSelect
                options={stateOptions}
                value={form.state}
                onChange={(v) => onStateChange(String(v))}
                disabled={readOnly}
                placeholder="Select state"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Warehouse</Label>
              <AutocompleteSelect
                options={warehouseOptions}
                value={form.warehouseId ? String(form.warehouseId) : ""}
                onChange={(v) => onWarehouseChange(String(v))}
                disabled={readOnly || !form.state}
                placeholder={form.state ? "Select warehouse" : "Select state first"}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Required By Date</Label>
              <Input
                type="date"
                disabled={readOnly}
                value={form.requiredByDate}
                onChange={(e) => set("requiredByDate", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <Label className="text-xs font-medium">Purpose / Justification</Label>
            <Textarea
              rows={2}
              disabled={readOnly}
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="Business justification for this purchase request..."
              className="min-h-[60px] rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHead label="Product / Item Details" sub="Add products with packaging UOM and base qty conversion." />
            <span className="inline-flex h-6 items-center rounded-full bg-brand-50 px-2.5 text-[11px] font-semibold text-brand-700">
              {filledLines.length} item{filledLines.length === 1 ? "" : "s"}
            </span>
          </div>

          {!readOnly && (
            <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_96px_auto]">
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
                  <Label className="text-xs font-medium">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={quickQty}
                    onChange={(e) => setQuickQty(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={quickAdd}
                    disabled={quickProductIds.length === 0}
                    className="h-8 gap-1.5 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Item
                  </Button>
                </div>
              </div>
            </div>
          )}

          {filledLines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
              <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/70" />
              <p className="text-sm font-semibold text-foreground">No items added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add a product to start building this request.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filledLines.map((line, idx) => {
                const info = enrichProductForProcurement(line.productId);
                const isExpanded = expandedLineUid === line.uid;
                return (
                  <div key={line.uid} className="rounded-lg border border-border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">
                        {idx + 1}. {line.productName}
                        <span className="ml-2 font-mono text-[10px] text-muted-foreground">{line.sku}</span>
                      </p>
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() =>
                            onChange({ ...form, lines: form.lines.filter((l) => l.uid !== line.uid) })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Request UOM</Label>
                        <AutocompleteSelect
                          options={PACKAGING_UOM_OPTIONS}
                          value={line.requestUom}
                          onChange={(v) => updateLine(line.uid, { requestUom: v as PackagingUom })}
                          disabled={readOnly}
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Requested Qty</Label>
                        <Input
                          type="number"
                          min={0}
                          disabled={readOnly}
                          value={line.requestedQty}
                          onChange={(e) =>
                            updateLine(line.uid, { requestedQty: Number(e.target.value) || 0 })
                          }
                          className={inputCls}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Total Qty (Base)</Label>
                        <Input
                          readOnly
                          value={`${line.totalQtyBase} ${line.baseUnit}`}
                          className={cn(inputCls, "bg-muted/30 font-medium")}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Conversion</Label>
                        <Input
                          readOnly
                          value={`1 ${line.packagingUnit} = ${line.conversionQty} ${line.baseUnit}`}
                          className={cn(inputCls, "bg-muted/30 text-[10px]")}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-[10px] text-muted-foreground">Line Remarks</Label>
                        <Input
                          disabled={readOnly}
                          value={line.remarks}
                          onChange={(e) => updateLine(line.uid, { remarks: e.target.value })}
                          placeholder="Optional"
                          className={inputCls}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mt-2 text-[10px] font-semibold text-brand-600"
                      onClick={() => setExpandedLineUid(isExpanded ? null : line.uid)}
                    >
                      {isExpanded ? "Hide" : "Show"} product info · MRP {formatCurrency(line.mrp)}
                    </button>
                    {isExpanded && <ProductInfoStrip info={info} />}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <SectionHead label="Remarks" sub="Additional notes for reviewers and approvers." />
              <Textarea
                rows={4}
                disabled={readOnly}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Optional remarks..."
                className="min-h-[90px] rounded-lg text-xs"
              />
            </div>
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-border bg-white p-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <SectionHead label="Attachments" sub="Upload supporting documents if needed." />
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 rounded-lg text-[11px] font-semibold"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" /> Add File
                    </Button>
                  )}
                </div>
                {!readOnly && <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />}
                {form.attachments.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    No attachments
                  </p>
                ) : (
                  <ul className="space-y-2">
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
    </div>
  );
}
