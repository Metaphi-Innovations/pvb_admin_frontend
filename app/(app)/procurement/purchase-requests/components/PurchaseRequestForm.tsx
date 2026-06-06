"use client";

import React, { useRef, useState } from "react";
import { Download, Eye, Package, Plus, Trash2, Upload } from "lucide-react";
import { CURRENT_USER } from "@/lib/procurement/config";
import { loadProcurementProducts } from "@/lib/procurement/products-data";
import { loadUOMMasters } from "@/app/(app)/masters/uom/uom-data";
import type { PRAttachment, PRLineItem, PurchaseRequest } from "../pr-data";
import {
  FLabel,
  PrefixInput,
  ProcButton,
  ProcCardSection,
  ProcDivider,
  ProcInput,
  ProcTextarea,
  SearchableSelect,
} from "../../design/proc-design";

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
  prNumber = "",
}: {
  form: PRFormValues;
  onChange: (f: PRFormValues) => void;
  readOnly?: boolean;
  prNumber?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const products = loadProcurementProducts();
  const uomOptions = loadUOMMasters().filter((u) => u.status === "active");
  const [quickProductId, setQuickProductId] = useState("");
  const [quickQty, setQuickQty] = useState("1");

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) => onChange({ ...form, [k]: v });

  const updateLine = (uid: string, patch: Partial<PRLineItem>) => {
    onChange({ ...form, lines: form.lines.map((l) => (l.uid === uid ? { ...l, ...patch } : l)) });
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
  const totalQty = filledLines.reduce((s, l) => s + l.requestedQty, 0);
  const displayNo = prNumber.replace(/^PR-/, "") || "Auto";

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.name} (${p.code})`,
  }));

  return (
    <div className="space-y-4">
      <ProcCardSection accent="navy" title="Request Details">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <FLabel>PR No.</FLabel>
            <PrefixInput prefix="PR |" value={displayNo} readOnly width={190} />
          </div>
          <ProcDivider className="hidden md:block h-10" />
          <div style={{ width: 170 }}>
            <FLabel>Initiated By</FLabel>
            <ProcInput readOnly value={form.requestedBy} className="w-full" />
          </div>
          <ProcDivider className="hidden md:block h-10" />
          <div style={{ width: 160 }}>
            <FLabel>PR Date</FLabel>
            <ProcInput type="date" disabled={readOnly} value={form.prDate} onChange={(e) => set("prDate", e.target.value)} className="w-full" />
          </div>
          <ProcDivider className="hidden md:block h-10" />
          <div style={{ width: 160 }}>
            <FLabel>Required By Date</FLabel>
            <ProcInput type="date" disabled={readOnly} value={form.requiredByDate} onChange={(e) => set("requiredByDate", e.target.value)} className="w-full" />
          </div>
        </div>
      </ProcCardSection>

      <ProcCardSection
        accent="green"
        icon={<Package className="w-3.5 h-3.5 text-[#1E9E61]" />}
        title="Products"
        badge={
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46]">{filledLines.length} items</span>
        }
        className="p-0"
      >
        {!readOnly && (
          <div className="px-4 py-3 flex flex-wrap items-end gap-2 border-b border-[#DDE3EF]" style={{ backgroundColor: "#FAFBFE" }}>
            <div className="w-full sm:w-[320px] shrink-0">
              <SearchableSelect
                label="Search product"
                placeholder="Search or select product…"
                options={productOptions}
                value={quickProductId}
                onChange={setQuickProductId}
              />
            </div>
            <div style={{ width: 75 }}>
              <FLabel>Qty</FLabel>
              <ProcInput type="number" min={1} value={quickQty} onChange={(e) => setQuickQty(e.target.value)} className="w-full" />
            </div>
            <ProcButton variant="primary" onClick={quickAdd} disabled={!quickProductId}>Add to request</ProcButton>
          </div>
        )}

        {filledLines.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <Package className="w-11 h-11 mx-auto text-[#9AAAC5] mb-2" />
            <p className="text-[13px] font-semibold text-[#0A1628]">No products added yet</p>
            {!readOnly && (
              <ProcButton variant="outline" className="mt-3 border-dashed" onClick={() => products[0] && addProductLine(products[0].id, 1)}>
                <Plus className="w-3.5 h-3.5" /> Add first product
              </ProcButton>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#DDE3EF]" style={{ backgroundColor: "#F7F9FC" }}>
                  {["#", "Product", "Code", "Description", "UOM", "Qty", "Remarks", ""].map((h, i) => (
                    <th key={h || i} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#9AAAC5]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filledLines.map((line, idx) => (
                  <tr key={line.uid} className="border-b hover:bg-[#F4F7FE]" style={{ borderColor: "#F0F3FA" }}>
                    <td className="px-3 py-2 text-[#6B80A0]">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-[#0A1628]">{line.productName}</td>
                    <td className="px-3 py-2 font-mono text-[#6B80A0]">{line.productCode}</td>
                    <td className="px-3 py-2 min-w-[120px]">
                      <ProcInput disabled={readOnly} value={line.description} onChange={(e) => updateLine(line.uid, { description: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="px-3 py-2 w-20">
                      <select disabled={readOnly} value={line.uom} onChange={(e) => updateLine(line.uid, { uom: e.target.value })} className="h-8 w-full text-xs border border-[#DDE3EF] rounded-[9px] px-1">
                        {uomOptions.map((u) => <option key={u.id} value={u.shortName}>{u.shortName}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 w-20">
                      <ProcInput type="number" min={0} disabled={readOnly} value={line.requestedQty} onChange={(e) => updateLine(line.uid, { requestedQty: Number(e.target.value) || 0 })} className="h-8 text-xs" />
                    </td>
                    <td className="px-3 py-2 min-w-[100px]">
                      <ProcInput disabled={readOnly} value={line.remarks} onChange={(e) => updateLine(line.uid, { remarks: e.target.value })} className="h-8 text-xs" placeholder="Optional" />
                    </td>
                    {!readOnly && (
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => onChange({ ...form, lines: form.lines.filter((l) => l.uid !== line.uid) })} className="p-1 text-[#6B80A0] hover:text-[#991B1B]">
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
      </ProcCardSection>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <ProcCardSection accent="navy" title="Remarks">
          <ProcTextarea rows={4} disabled={readOnly} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} placeholder="Purpose or notes for approvers…" />
        </ProcCardSection>

        <div className="space-y-4">
          <ProcCardSection accent="green" title="Request Summary">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#6B80A0]">Line items</span><span className="font-semibold tabular-nums">{filledLines.length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B80A0]">Total quantity</span><span className="font-semibold tabular-nums">{totalQty}</span></div>
              <div className="flex justify-between border-t border-[#DDE3EF] pt-2"><span className="font-bold text-[#0A1628]">Status</span><span className="font-bold text-brand-700">{filledLines.length ? "Ready" : "Incomplete"}</span></div>
            </div>
          </ProcCardSection>

          <ProcCardSection accent="amber" title="Attachments">
            {!readOnly && (
              <>
                <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
                <ProcButton variant="outline" size="sm" className="w-full mb-2" onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" /> Upload file</ProcButton>
              </>
            )}
            {form.attachments.length === 0 ? (
              <p className="text-[11px] text-[#6B80A0] text-center py-3 border border-dashed border-[#DDE3EF] rounded-[9px]">No attachments</p>
            ) : (
              <ul className="space-y-1">
                {form.attachments.map((a) => (
                  <li key={a.uid} className="flex items-center gap-2 text-[12px] py-1.5 px-2 rounded-[9px] border border-[#DDE3EF]">
                    <span className="flex-1 truncate">{a.name}</span>
                    <Eye className="w-3.5 h-3.5 text-[#6B80A0]" />
                    <Download className="w-3.5 h-3.5 text-[#6B80A0]" />
                    {!readOnly && (
                      <button type="button" onClick={() => onChange({ ...form, attachments: form.attachments.filter((x) => x.uid !== a.uid) })}><Trash2 className="w-3.5 h-3.5 text-[#991B1B]" /></button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ProcCardSection>
        </div>
      </div>
    </div>
  );
}
