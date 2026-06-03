"use client";

import React, { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Eye, Package, Plus, Search, Trash2, Upload } from "lucide-react";
import { CURRENT_USER } from "@/lib/procurement/config";
import { loadProcurementProducts } from "@/lib/procurement/products-data";
import { loadUOMMasters } from "@/app/(app)/masters/uom/uom-data";
import type { PRAttachment, PRLineItem, PurchaseRequest } from "../pr-data";

const labelClass = "text-xs font-medium text-foreground mb-1 block";
const fieldClass =
  "h-9 text-sm border-border/70 bg-white rounded-md shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30";

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

export function PurchaseRequestForm({
  form,
  onChange,
  readOnly,
}: {
  form: PRFormValues;
  onChange: (f: PRFormValues) => void;
  readOnly?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const products = loadProcurementProducts();
  const uomOptions = loadUOMMasters().filter((u) => u.status === "active");

  const [quickProductId, setQuickProductId] = useState("");
  const [quickQty, setQuickQty] = useState("1");

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) => onChange({ ...form, [k]: v });

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
    if (!quickProductId) return;
    addProductLine(Number(quickProductId), Number(quickQty) || 1);
    setQuickProductId("");
    setQuickQty("1");
  };

  const removeLine = (uid: string) => {
    onChange({ ...form, lines: form.lines.filter((l) => l.uid !== uid) });
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const att: PRAttachment = {
      uid: `att-${Date.now()}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
      uploadedBy: CURRENT_USER,
    };
    onChange({ ...form, attachments: [...form.attachments, att] });
    e.target.value = "";
  };

  const filledLines = form.lines.filter((l) => l.productId > 0);
  const totalQty = filledLines.reduce((s, l) => s + l.requestedQty, 0);

  return (
    <div className="space-y-5">
      {/* Top fields — 3 column like Swipe */}
      <div className="bg-white rounded-lg border border-border/60 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className={labelClass}>Initiated By</Label>
              <Input readOnly value={form.requestedBy} className={cn(fieldClass, "bg-muted/25")} />
            </div>
            <div>
              <Label className={labelClass}>PR Date</Label>
              <Input
                type="date"
                disabled={readOnly}
                value={form.prDate}
                onChange={(e) => set("prDate", e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <Label className={labelClass}>Required By Date</Label>
              <Input
                type="date"
                disabled={readOnly}
                value={form.requiredByDate}
                onChange={(e) => set("requiredByDate", e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

      {/* Products & services block */}
      <div className="bg-white rounded-lg border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Products &amp; Services</h2>
          <span className="text-xs text-muted-foreground">{filledLines.length} item(s)</span>
        </div>

        {/* Quick add row */}
        {!readOnly && (
          <div className="px-4 py-3 bg-muted/20 border-b border-border/50 flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-[11px] text-muted-foreground mb-1 block">Search product</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={quickProductId}
                  onChange={(e) => setQuickProductId(e.target.value)}
                  className={cn(fieldClass, "pl-9 w-full")}
                >
                  <option value="">Search or select product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="w-24">
              <Label className="text-[11px] text-muted-foreground mb-1 block">Qty</Label>
              <Input
                type="number"
                min={1}
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                className={fieldClass}
              />
            </div>
            <Button
              type="button"
              size="sm"
              className="h-9 text-sm bg-brand-600 hover:bg-brand-700 text-white px-4"
              onClick={quickAdd}
              disabled={!quickProductId}
            >
              <Plus className="w-4 h-4 mr-1" /> Add to request
            </Button>
          </div>
        )}

        {/* Table or empty state */}
        {filledLines.length === 0 ? (
          <div className="py-14 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-medium text-foreground">No products added yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Search and add products using the row above, or pick from the product master.
            </p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4 h-8 text-xs"
                onClick={() => products[0] && addProductLine(products[0].id, 1)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add first product
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/15">
                  {["#", "Product", "Code", "Description", "UOM", "Qty", "Item remarks", ""].map((h, i) => (
                    <th
                      key={h || i}
                      className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledLines.map((line, idx) => (
                  <tr key={line.uid} className="border-b border-border/40 hover:bg-muted/10">
                    <td className="px-3 py-2 text-xs text-muted-foreground w-8">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground min-w-[140px]">{line.productName}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{line.productCode}</td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <Input
                        disabled={readOnly}
                        value={line.description}
                        onChange={(e) => updateLine(line.uid, { description: e.target.value })}
                        className="h-8 text-xs border-border/60"
                      />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <select
                        disabled={readOnly}
                        value={line.uom}
                        onChange={(e) => updateLine(line.uid, { uom: e.target.value })}
                        className="w-full h-8 text-xs border border-border/60 rounded-md px-1.5"
                      >
                        {uomOptions.map((u) => (
                          <option key={u.id} value={u.unitCode}>
                            {u.shortName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 w-20">
                      <Input
                        type="number"
                        min={0}
                        disabled={readOnly}
                        value={line.requestedQty}
                        onChange={(e) =>
                          updateLine(line.uid, { requestedQty: Number(e.target.value) || 0 })
                        }
                        className="h-8 text-xs border-border/60"
                      />
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <Input
                        disabled={readOnly}
                        value={line.remarks}
                        onChange={(e) => updateLine(line.uid, { remarks: e.target.value })}
                        className="h-8 text-xs border-border/60"
                        placeholder="Optional"
                      />
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => removeLine(line.uid)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom split — remarks + summary + attachments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-lg border border-border/60 p-4">
            <Label className={labelClass}>Remarks</Label>
            <Textarea
              disabled={readOnly}
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Purpose, justification, or notes for approvers…"
              className="min-h-[88px] text-sm resize-none border-border/60 mt-1"
            />
          </div>

          <div className="bg-white rounded-lg border border-border/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className={cn(labelClass, "mb-0")}>Attachments</Label>
              {!readOnly && (
                <>
                  <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Upload file
                  </Button>
                </>
              )}
            </div>
            {form.attachments.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2 border border-dashed border-border/60 rounded-md text-center">
                No attachments
              </p>
            ) : (
              <ul className="divide-y divide-border/50 border border-border/60 rounded-md">
                {form.attachments.map((a) => (
                  <li key={a.uid} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="flex-1 truncate font-medium">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.size}</span>
                    <button type="button" className="p-1 hover:bg-muted rounded" title="View">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button type="button" className="p-1 hover:bg-muted rounded" title="Download">
                      <Download className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {!readOnly && (
                      <button
                        type="button"
                        className="p-1 hover:bg-red-50 text-red-600 rounded"
                        onClick={() =>
                          onChange({
                            ...form,
                            attachments: form.attachments.filter((x) => x.uid !== a.uid),
                          })
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Summary panel — like Swipe totals */}
        <div className="lg:col-span-5">
          <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-4 sticky top-4">
            <p className="text-xs font-medium text-emerald-800/80 mb-3">Request summary</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Line items</span>
                <span className="font-medium text-foreground">{filledLines.length}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total quantity</span>
                <span className="font-medium text-foreground">{totalQty}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Attachments</span>
                <span className="font-medium text-foreground">{form.attachments.length}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200/60 flex justify-between items-center">
              <span className="text-sm font-semibold text-emerald-900">Status</span>
              <span className="text-lg font-bold text-emerald-900 tabular-nums">
                {filledLines.length > 0 ? "Ready" : "Incomplete"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
