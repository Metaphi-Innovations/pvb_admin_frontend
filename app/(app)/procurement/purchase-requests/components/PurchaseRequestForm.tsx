"use client";

import React, { useRef, useState } from "react";
import { Download, Eye, Package, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { CURRENT_USER } from "@/lib/procurement/config";
import { loadProcurementProducts } from "@/lib/procurement/products-data";
import { loadUOMMasters } from "@/app/(app)/masters/uom/uom-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import type { PRAttachment, PRLineItem, PurchaseRequest } from "../pr-data";

export interface PRFormValues {
  prDate: string;
  requestedBy: string;
  requiredByDate: string;
  remarks: string;
  lines: PRLineItem[];
  attachments: PRAttachment[];
}

export function prToFormValues(pr: PurchaseRequest): PRFormValues {
  return {
    prDate: pr.prDate,
    requestedBy: pr.requestedBy,
    requiredByDate: pr.requiredByDate,
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
    uom: "",
    requestedQty: 1,
    remarks: "",
  };
}

export const DEFAULT_PR_FORM: PRFormValues = {
  prDate: new Date().toISOString().slice(0, 10),
  requestedBy: CURRENT_USER,
  requiredByDate: "",
  remarks: "",
  lines: [],
  attachments: [],
};

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const inputCls = "h-8 rounded-lg text-xs";

const normalizeProductKey = (value?: string) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

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
  const products = loadProcurementProducts();
  const masterProducts = loadProducts();
  const uomOptions = loadUOMMasters().filter((u) => u.status === "active");
  const [quickProductIds, setQuickProductIds] = useState<string[]>([]);
  const [quickQty, setQuickQty] = useState("1");

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) =>
    onChange({ ...form, [k]: v });

  const updateLine = (uid: string, patch: Partial<PRLineItem>) => {
    onChange({
      ...form,
      lines: form.lines.map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
    });
  };

  const addProductLine = (productId: number, qty: number) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const existing = form.lines.find((l) => l.productId === p.id);
    if (existing) {
      updateLine(existing.uid, { requestedQty: existing.requestedQty + qty });
      return;
    }
    onChange({
      ...form,
      lines: [
        ...form.lines,
        {
          uid: emptyPRLine().uid,
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          description: p.description,
          uom: p.uom,
          requestedQty: qty,
          remarks: "",
        },
      ],
    });
  };

  const quickAdd = () => {
    if (quickProductIds.length === 0) return;
    const qty = Number(quickQty) || 1;
    const selectedIds = Array.from(new Set(quickProductIds.map(Number)));
    const productMap = new Map(products.map((product) => [product.id, product]));
    const nextLines = [...form.lines];

    selectedIds.forEach((productId) => {
      const p = productMap.get(productId);
      if (!p) return;

      const existingIndex = nextLines.findIndex((line) => line.productId === p.id);
      if (existingIndex >= 0) {
        nextLines[existingIndex] = {
          ...nextLines[existingIndex],
          requestedQty: nextLines[existingIndex].requestedQty + qty,
        };
        return;
      }

      nextLines.push({
        uid: emptyPRLine().uid,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        description: p.description,
        uom: p.uom,
        requestedQty: qty,
        remarks: "",
      });
    });

    onChange({
      ...form,
      lines: nextLines,
    });
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
  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }));
  const uomDropdownOptions = uomOptions.map((u) => ({
    value: u.shortName,
    label: u.shortName,
  }));
  const getProductUnits = (line: PRLineItem) => {
    const lineCode = normalizeProductKey(line.productCode);
    const lineName = normalizeProductKey(line.productName);
    const match = masterProducts.find((product) => {
      const productIdKey = normalizeProductKey(product.productId);
      const productNameKey = normalizeProductKey(product.productName);
      return (lineCode && lineCode === productIdKey) || (lineName && lineName === productNameKey);
    });

    return {
      baseUnit: match?.baseUnit || "-",
      packagingUnit: match?.packagingUnit || "-",
    };
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="space-y-5">
        <div>
          <SectionHead
            label="Request Details"
            sub="Core purchase request information and required timeline."
          />
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
              <Label className="text-xs font-medium">Requested By</Label>
              <Input
                value={form.requestedBy}
                readOnly
                className={cn(inputCls, "bg-muted/30 text-muted-foreground")}
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
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <SectionHead
              label="Product / Item Details"
              sub="Add products and capture compact request quantities and notes."
            />
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
                    renderTriggerLabel={(selected) => {
                      if (!Array.isArray(selected) || selected.length === 0) {
                        return "Search or select products...";
                      }
                      if (selected.length === 1) {
                        return selected[0].label;
                      }
                      return `${selected.length} products selected`;
                    }}
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
              {!readOnly && products[0] && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-8 rounded-lg border-dashed text-xs font-semibold"
                  onClick={() => addProductLine(products[0].id, 1)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add first item
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border bg-white">
              <table className="min-w-full table-fixed">
                <thead className="bg-muted/30">
                  <tr className="border-b border-border">
                    <th className="w-12 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Sr.</th>
                    <th className="min-w-[180px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                    <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Code</th>
                    <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Base Unit</th>
                    <th className="w-32 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Packaging Unit</th>
                    <th className="min-w-[180px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Description</th>
                    <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">UOM</th>
                    <th className="w-24 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Qty</th>
                    <th className="min-w-[160px] px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Remarks</th>
                    {!readOnly && <th className="w-14 px-3 py-2 text-right text-[11px] font-semibold text-muted-foreground">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filledLines.map((line, idx) => {
                    const units = getProductUnits(line);
                    return (
                    <tr key={line.uid} className="align-top transition-colors hover:bg-muted/10">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-xs font-medium text-foreground">{line.productName}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{line.productCode}</td>
                      <td className="px-3 py-2.5 text-xs text-foreground">{units.baseUnit}</td>
                      <td className="px-3 py-2.5 text-xs text-foreground">{units.packagingUnit}</td>
                      <td className="px-3 py-2.5">
                        <Input
                          disabled={readOnly}
                          value={line.description}
                          onChange={(e) => updateLine(line.uid, { description: e.target.value })}
                          className={cn(inputCls, "min-w-[150px]")}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <AutocompleteSelect
                          options={uomDropdownOptions}
                          value={line.uom}
                          onChange={(val) => updateLine(line.uid, { uom: String(val) })}
                          placeholder="Select UOM"
                          searchPlaceholder="Search UOM..."
                          disabled={readOnly}
                          className="h-8 rounded-lg text-xs"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          type="number"
                          min={0}
                          disabled={readOnly}
                          value={line.requestedQty}
                          onChange={(e) =>
                            updateLine(line.uid, {
                              requestedQty: Number(e.target.value) || 0,
                            })
                          }
                          className={cn(inputCls, "w-20")}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Input
                          disabled={readOnly}
                          value={line.remarks}
                          onChange={(e) => updateLine(line.uid, { remarks: e.target.value })}
                          placeholder="Optional"
                          className={cn(inputCls, "min-w-[140px]")}
                        />
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2.5 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              onChange({
                                ...form,
                                lines: form.lines.filter((l) => l.uid !== line.uid),
                              })
                            }
                            className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                      
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-border/60 pt-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <SectionHead label="Remarks" sub="Add context or notes for reviewers and approvers." />
              <Textarea
                rows={5}
                disabled={readOnly}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Purpose or notes for approvers..."
                className="min-h-[110px] rounded-lg text-xs"
              />
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl border border-border bg-white p-3.5 lg:max-w-[320px]">
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
              {!readOnly && (
                <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
              )}
              {form.attachments.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  No attachments
                </p>
              ) : (
                <ul className="space-y-2">
                  {form.attachments.map((a) => (
                    <li
                      key={a.uid}
                      className="max-w-[100px] items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">{a.name}</span>
                      <span className="hidden text-muted-foreground sm:inline">{a.size}</span>
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
                          className="text-red-600 transition-colors hover:text-red-700"
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
