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
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";

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
    <div className="mb-3 pb-2 border-b border-border">
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

  const stateOptions = useMemo(() => stateSelectOptions(), []);
  const warehouseOptions = useMemo(
    () => warehouseSelectOptions(form.state),
    [form.state],
  );

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) =>
    onChange({ ...form, [k]: v });

  const onAddItem = (productIds: string[], qty: number, remarks: string) => {
    let nextLines = [...form.lines];
    for (const idStr of Array.from(new Set(productIds))) {
      const productId = Number(idStr);
      const line = lineFromProduct(productId, qty, remarks);
      if (!line) continue;
      const idx = nextLines.findIndex((l) => l.productId === productId);
      if (idx >= 0) {
        const existing = nextLines[idx];
        const nextPackingQty = existing.requestedQty + qty;
        nextLines[idx] = {
          ...existing,
          requestedQty: nextPackingQty,
          totalQtyBase: calcPackingToBaseQty(nextPackingQty, existing.conversionQty),
          remarks: remarks || existing.remarks,
        };
      } else {
        nextLines.push({ ...line, uid: emptyPRLine().uid });
      }
    }
    onChange({ ...form, lines: nextLines });
  };

  const onRemoveItem = (uid: string) => {
    onChange({ ...form, lines: form.lines.filter((l) => l.uid !== uid) });
  };

  const onUpdateItem = (uid: string, patch: Partial<PRLineItem>) => {
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

  const departmentLabel =
    DEPARTMENT_OPTIONS.find((d) => d.value === form.department)?.label ?? form.department;
  const priorityLabel =
    PR_PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label ?? form.priority;

  return (
    <div className={cn("rounded-xl border border-border bg-white p-4 shadow-sm", readOnly && "w-full")}>
      <div className="space-y-4">
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
          <div className="mt-3 space-y-1">
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

        <ProductItemDetailsSection
          products={productOptions}
          items={form.lines}
          onAddItem={onAddItem}
          onRemoveItem={onRemoveItem}
          onUpdateItem={onUpdateItem}
          readOnly={readOnly}
        />

        <div className="border-t border-border/60 pt-4">
          <SectionHead
            label="Remarks & Attachments"
            sub={readOnly ? undefined : "Additional notes and supporting documents."}
          />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
            <div className="rounded-xl border border-border bg-muted/10 p-3.5">
              {!readOnly && (
                <div className="mb-2.5 flex items-center justify-between gap-2">
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
  );
}
