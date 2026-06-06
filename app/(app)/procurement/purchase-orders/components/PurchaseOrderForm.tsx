"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  Search,
  Upload,
  Trash2,
  Download,
  Eye,
  Package,
  Info,
} from "lucide-react";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import {
  addProcurementProduct,
  loadProcurementProducts,
  type ProcurementProduct,
} from "@/lib/procurement/products-data";
import { formatCurrency } from "@/lib/procurement/utils";
import { getActiveSuppliers } from "../../masters/suppliers/supplier-data";
import { getPRById, loadPurchaseRequests } from "../../purchase-requests/pr-data";
import type { POLineItem, POAttachment, PurchaseOrder } from "../po-data";
import { recalcPO } from "../po-data";
import {
  FLabel,
  PrefixInput,
  ProcButton,
  ProcCardSection,
  ProcInput,
  ProcTextarea,
  SearchableSelect,
} from "../../design/proc-design";

export type POFormValues = Omit<
  PurchaseOrder,
  | "id"
  | "poNumber"
  | "summary"
  | "createdBy"
  | "createdDate"
  | "updatedBy"
  | "updatedDate"
  | "approvedBy"
  | "approvedDate"
  | "activity"
  | "status"
>;

export function emptyPOLine(): POLineItem {
  return {
    uid: `pl-${Date.now()}`,
    productId: 0,
    productCode: "",
    productName: "",
    description: "",
    uom: "",
    orderedQty: 1,
    unitPrice: 0,
    discountPct: 0,
    cgstPct: 9,
    sgstPct: 9,
    igstPct: 0,
    grossAmount: 0,
    taxAmount: 0,
    netAmount: 0,
    deliverySchedule: "",
  };
}

function paymentTermDays(term: string): number {
  const m = term.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function defaultPOForm(sourcePrId: number | null = null): POFormValues {
  const pr = sourcePrId ? getPRById(sourcePrId) : null;
  const supplier = getActiveSuppliers()[0];
  const products = loadProcurementProducts();

  const lines =
    pr?.lines.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return {
        ...emptyPOLine(),
        uid: `pl-${l.uid}`,
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        description: l.description,
        uom: l.uom,
        orderedQty: l.requestedQty,
        unitPrice: p?.estimatedUnitPrice ?? 0,
        prLineUid: l.uid,
      };
    }) ?? [];

  const paymentTerms = "net-30";
  return {
    poDate: new Date().toISOString().slice(0, 10),
    supplierId: supplier?.id ?? 0,
    supplierName: supplier?.supplierName ?? "",
    supplierType: supplier?.supplierType ?? "",
    supplierContactPerson: supplier?.contactPerson ?? "",
    supplierMobile: supplier?.mobile || supplier?.phone || "",
    supplierMobileCountry: "+91",
    supplierEmail: supplier?.email ?? "",
    supplierGstin: supplier?.gstNumber ?? "",
    referenceNumber: "",
    currency: "INR",
    paymentTerms,
    creditDays: paymentTermDays(paymentTerms),
    deliveryTerms: "",
    expectedDeliveryDate: "",
    notes: pr?.remarks ?? "",
    sourcePrId: pr?.id ?? null,
    sourcePrNumber: pr?.prNumber ?? "",
    billing: { ...COMPANY_BILLING },
    shipping: {
      shipToLocation: "Pune Warehouse",
      branch: "hq-pune",
      address: "Warehouse 2, Hinjawadi, Pune",
      contactPerson: "Warehouse Manager",
      contactNumber: "9876500000",
      sameAsBilling: false,
    },
    lines,
    terms: [],
    attachments: [],
    otherCharges: 0,
  };
}

export function poToFormValues(po: PurchaseOrder): POFormValues {
  const {
    id: _id,
    poNumber: _poNumber,
    summary: _summary,
    status: _status,
    createdBy: _cb,
    createdDate: _cd,
    updatedBy: _ub,
    updatedDate: _ud,
    approvedBy: _ab,
    approvedDate: _ad,
    activity: _activity,
    ...rest
  } = po;
  return {
    ...rest,
    supplierContactPerson: po.supplierContactPerson ?? "",
    supplierMobile: po.supplierMobile ?? "",
    supplierMobileCountry: po.supplierMobileCountry ?? "+91",
    supplierEmail: po.supplierEmail ?? "",
    supplierGstin: po.supplierGstin ?? "",
  };
}

export function PurchaseOrderForm({
  form,
  onChange,
  readOnly,
  poNumber = "",
  status,
  submittedDate,
}: {
  form: POFormValues;
  onChange: (f: POFormValues) => void;
  poNumber?: string;
  readOnly?: boolean;
  status?: string;
  submittedDate?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [selectedProdIds, setSelectedProdIds] = useState<number[]>([]);
  const [quickProduct, setQuickProduct] = useState({
    name: "",
    code: "",
    categoryName: "",
    uom: "",
    description: "",
  });

  const products = loadProcurementProducts();
  const suppliers = getActiveSuppliers();
  const prList = loadPurchaseRequests().filter((p) =>
    ["approved", "partially_converted"].includes(p.status),
  );

  const poType: "pr" | "direct" = form.sourcePrId ? "pr" : "direct";

  const preview = useMemo(
    () =>
      recalcPO({
        id: 0,
        poNumber: "",
        ...form,
        summary: {
          grossAmount: 0,
          totalDiscount: 0,
          taxableValue: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalIgst: 0,
          otherCharges: 0,
          grandTotal: 0,
          amountInWords: "",
        },
        status: "draft",
        createdBy: "",
        createdDate: "",
        updatedBy: "",
        updatedDate: "",
        approvedBy: "",
        approvedDate: "",
        activity: [],
      }),
    [form],
  );

  const patch = (p: Partial<POFormValues>) => onChange({ ...form, ...p });

  const setType = (next: "pr" | "direct") => {
    if (readOnly) return;
    if (next === "direct") {
      patch({ sourcePrId: null, sourcePrNumber: "", lines: [] });
      return;
    }
    const pr = prList[0];
    if (pr) loadFromPR(pr.id);
  };

  const loadFromPR = (prId: number) => {
    const pr = getPRById(prId);
    if (!pr) return;
    const lines = pr.lines.map((l) => {
      const p = products.find((x) => x.id === l.productId);
      return {
        ...emptyPOLine(),
        uid: `pl-${l.uid}`,
        productId: l.productId,
        productCode: l.productCode,
        productName: l.productName,
        description: l.description,
        uom: l.uom,
        orderedQty: l.requestedQty,
        unitPrice: p?.estimatedUnitPrice ?? 0,
        prLineUid: l.uid,
      };
    });
    patch({
      sourcePrId: pr.id,
      sourcePrNumber: pr.prNumber,
      notes: pr.remarks,
      lines,
      deliveryTerms: `From ${pr.requestedBy} (${pr.prDate})`,
    });
  };

  const updateLine = (uid: string, p: Partial<POLineItem>) =>
    patch({ lines: form.lines.map((l) => (l.uid === uid ? { ...l, ...p } : l)) });

  const addSelectedProducts = () => {
    if (!selectedProdIds.length) return;
    const lines = selectedProdIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is ProcurementProduct => !!p)
      .map((p) => ({
        ...emptyPOLine(),
        uid: `pl-${p.id}-${Date.now()}`,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        description: p.description,
        uom: p.uom,
        unitPrice: p.estimatedUnitPrice,
      }));
    patch({ lines: [...form.lines, ...lines] });
    setSelectedProdIds([]);
    setShowProductModal(false);
  };

  const filteredProducts = products.filter((p) => {
    const q = prodSearch.toLowerCase();
    const mSearch = !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const mCategory = !prodCategory || p.categoryName === prodCategory;
    return mSearch && mCategory;
  });

  const categories = Array.from(new Set(products.map((p) => p.categoryName)));
  const previewLines = preview.lines;

  const linkedPr = form.sourcePrId ? getPRById(form.sourcePrId) : null;
  const displayPoNo = poNumber.replace(/^PO-/, "") || "Auto";
  const totalQty = form.lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalGst = preview.summary.totalCgst + preview.summary.totalSgst + preview.summary.totalIgst;

  const getRequestedQty = (line: POLineItem) => {
    if (!line.prLineUid || !linkedPr) return null;
    return linkedPr.lines.find((l) => l.uid === line.prLineUid)?.requestedQty ?? line.orderedQty;
  };

  const selectSupplier = (idStr: string) => {
    if (!idStr) {
      patch({ supplierId: 0, supplierName: "" });
      return;
    }
    const s = suppliers.find((x) => x.id === Number(idStr));
    if (!s) return;
    patch({
      supplierId: s.id,
      supplierName: s.supplierName,
      supplierType: s.supplierType,
      supplierContactPerson: s.contactPerson || "",
      supplierMobile: s.mobile || s.phone || "",
      supplierEmail: s.email || "",
      supplierGstin: s.gstNumber || "",
    });
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    patch({
      attachments: [
        ...form.attachments,
        {
          uid: `att-${Date.now()}`,
          name: file.name,
          size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          uploadedAt: new Date().toISOString().slice(0, 10),
          uploadedBy: "Admin",
        } as POAttachment,
      ],
    });
    e.target.value = "";
  };

  const prOptions = prList.map((p) => ({
    value: String(p.id),
    label: p.prNumber,
  }));
  const supplierOptions = suppliers.map((s) => ({
    value: String(s.id),
    label: s.supplierName,
  }));

  return (
    <div className="space-y-4">
      {status === "pending_approval" && (
        <div className="flex items-start gap-2.5 rounded-[13px] border border-[#93C5FD] bg-[#EFF6FF] px-4 py-3 text-[13px] text-[#1E40AF]">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            This PO is pending approval from Area Manager.
            {submittedDate ? ` Submitted on ${submittedDate}.` : ""}
          </p>
        </div>
      )}

      {!readOnly && (
        <div className="flex flex-wrap gap-4 text-[13px] text-[#3D5473]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={poType === "pr"} onChange={() => setType("pr")} />
            From Purchase Request
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={poType === "direct"} onChange={() => setType("direct")} />
            Direct Purchase Order
          </label>
        </div>
      )}

      <ProcCardSection accent="navy" title="PO Details">
        <div className="flex flex-wrap items-end gap-3">
          <div className="shrink-0">
            <FLabel>PO No.</FLabel>
            <PrefixInput prefix="PO |" value={displayPoNo} readOnly width={190} />
          </div>
          <div className="shrink-0 w-[220px]">
            <SearchableSelect
              label="PR Reference"
              placeholder="Select PR"
              width={220}
              dropdownMinWidth={280}
              disabled={readOnly || poType === "direct"}
              options={prOptions}
              value={form.sourcePrId ? String(form.sourcePrId) : ""}
              onChange={(v) => v && loadFromPR(Number(v))}
            />
          </div>
          <div className="shrink-0 w-[180px]">
            <SearchableSelect
              label="Supplier"
              placeholder="Select supplier"
              width={180}
              disabled={readOnly}
              options={supplierOptions}
              value={form.supplierId ? String(form.supplierId) : ""}
              onChange={selectSupplier}
            />
          </div>
          <div className="shrink-0" style={{ width: 160 }}>
            <FLabel>PO Date</FLabel>
            <ProcInput type="date" disabled={readOnly} value={form.poDate} onChange={(e) => patch({ poDate: e.target.value })} className="w-full" />
          </div>
          <div className="shrink-0" style={{ width: 160 }}>
            <FLabel>Delivery Date</FLabel>
            <ProcInput type="date" disabled={readOnly} value={form.expectedDeliveryDate} onChange={(e) => patch({ expectedDeliveryDate: e.target.value })} className="w-full" />
          </div>
        </div>
      </ProcCardSection>

      <ProcCardSection
        accent="green"
        icon={<Package className="w-3.5 h-3.5 text-[#1E9E61]" />}
        title={poType === "pr" ? "Products from PR" : "Products"}
        badge={
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#065F46]">{form.lines.length} items</span>
        }
        className="p-0"
      >
        {poType === "direct" && form.lines.length === 0 && !readOnly ? (
          <div className="py-10 px-4 text-center">
            <Package className="w-11 h-11 mx-auto text-[#9AAAC5] mb-2" />
            <p className="text-[13px] font-semibold text-[#0A1628]">No products added yet</p>
            <ProcButton variant="outline" className="mt-3 border-dashed" onClick={() => setShowProductModal(true)}>
              <Plus className="w-3.5 h-3.5" /> Add first product
            </ProcButton>
          </div>
        ) : (
          <>
            {poType === "direct" && !readOnly && (
              <div className="px-4 py-3 border-b border-[#DDE3EF]" style={{ backgroundColor: "#FAFBFE" }}>
                <ProcButton variant="primary" size="sm" onClick={() => setShowProductModal(true)}>
                  <Plus className="w-3.5 h-3.5" /> Add Product
                </ProcButton>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-[13px] min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#DDE3EF]" style={{ backgroundColor: "#F7F9FC" }}>
                    {["#", "Product", ...(poType === "pr" ? ["Requested Qty"] : []), "Ordered Qty", "Unit", "Rate", "GST %", "Total", ""].map((h, i) => (
                      <th key={h || i} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#9AAAC5]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => {
                    const reqQty = getRequestedQty(line);
                    const gstPct = line.cgstPct + line.sgstPct + line.igstPct;
                    const calcLine = previewLines.find((l) => l.uid === line.uid);
                    return (
                      <tr key={line.uid} className="border-b hover:bg-[#F4F7FE]" style={{ borderColor: "#F0F3FA" }}>
                        <td className="px-3 py-2 text-[#6B80A0]">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium text-[#0A1628]">{line.productName}</td>
                        {poType === "pr" && (
                          <td className="px-3 py-2 text-center tabular-nums text-[#6B80A0]">{reqQty ?? "—"}</td>
                        )}
                        <td className="px-3 py-2 w-24">
                          <ProcInput type="number" min={0} disabled={readOnly} value={line.orderedQty} onChange={(e) => updateLine(line.uid, { orderedQty: Number(e.target.value) || 0 })} className="h-8 text-xs" />
                        </td>
                        <td className="px-3 py-2 text-[#6B80A0]">{line.uom || "—"}</td>
                        <td className="px-3 py-2 w-28">
                          <ProcInput type="number" min={0} disabled={readOnly} value={line.unitPrice} onChange={(e) => updateLine(line.uid, { unitPrice: Number(e.target.value) || 0 })} className="h-8 text-xs" />
                        </td>
                        <td className="px-3 py-2 w-20">
                          <ProcInput
                            type="number"
                            min={0}
                            disabled={readOnly}
                            value={gstPct}
                            onChange={(e) => {
                              const gst = Number(e.target.value) || 0;
                              updateLine(line.uid, { cgstPct: gst / 2, sgstPct: gst / 2, igstPct: 0 });
                            }}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(calcLine?.netAmount ?? line.netAmount)}</td>
                        {!readOnly && (
                          <td className="px-2 py-2">
                            <button type="button" onClick={() => patch({ lines: form.lines.filter((x) => x.uid !== line.uid) })} className="p-1 text-[#6B80A0] hover:text-[#991B1B]">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ProcCardSection>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <ProcCardSection accent="amber" title="Remarks">
          <ProcTextarea rows={4} disabled={readOnly} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Internal remarks…" />
        </ProcCardSection>

        <div className="space-y-4">
          <ProcCardSection accent="green" title="PO Summary">
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#6B80A0]">Items</span><span className="font-semibold tabular-nums">{form.lines.length}</span></div>
              <div className="flex justify-between"><span className="text-[#6B80A0]">Total qty</span><span className="font-semibold tabular-nums">{totalQty}</span></div>
              <div className="flex justify-between"><span className="text-[#6B80A0]">Subtotal</span><span className="font-semibold tabular-nums">{formatCurrency(preview.summary.grossAmount)}</span></div>
              <div className="flex justify-between"><span className="text-[#6B80A0]">GST</span><span className="font-semibold tabular-nums">{formatCurrency(totalGst)}</span></div>
              <div className="flex justify-between items-center gap-2">
                <span className="text-[#6B80A0]">Other charges</span>
                <ProcInput type="number" disabled={readOnly} value={form.otherCharges} onChange={(e) => patch({ otherCharges: Number(e.target.value) || 0 })} className="h-8 w-24 text-xs text-right" />
              </div>
              <div className="flex justify-between border-t border-[#DDE3EF] pt-2">
                <span className="font-bold text-[#0A1628]">Grand total</span>
                <span className="font-bold text-brand-700 tabular-nums">{formatCurrency(preview.summary.grandTotal)}</span>
              </div>
            </div>
          </ProcCardSection>

          <ProcCardSection accent="amber" title="Attachments">
            {!readOnly && (
              <>
                <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
                <ProcButton variant="outline" size="sm" className="w-full mb-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Upload file
                </ProcButton>
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
                      <button type="button" onClick={() => patch({ attachments: form.attachments.filter((x) => x.uid !== a.uid) })}>
                        <Trash2 className="w-3.5 h-3.5 text-[#991B1B]" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ProcCardSection>
        </div>
      </div>

      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[13px] border border-[#DDE3EF] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-xl">
            <div className="px-4 py-3 border-b border-[#DDE3EF] flex items-center justify-between" style={{ backgroundColor: "#F7F9FC" }}>
              <h3 className="text-[13px] font-bold text-[#0A1628]">Select Products</h3>
              <button type="button" className="p-1.5 hover:bg-[#F4F7FE] rounded-[9px]" onClick={() => setShowProductModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9AAAC5] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <ProcInput className="pl-8" placeholder="Search product" value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} />
                </div>
                <select className="h-[38px] px-2 text-[13px] rounded-[9px] border-[1.5px] border-[#DDE3EF]" value={prodCategory} onChange={(e) => setProdCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <ProcButton variant="outline" onClick={() => setShowQuickProduct(true)}>Create Product</ProcButton>
                <ProcButton variant="primary" onClick={addSelectedProducts}>Add Selected</ProcButton>
              </div>
              <div className="border border-[#DDE3EF] rounded-[9px] overflow-auto max-h-[48vh]">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#DDE3EF]" style={{ backgroundColor: "#F7F9FC" }}>
                      <th className="px-2 py-2 w-8" />
                      <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-[#9AAAC5]">Product</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-[#9AAAC5]">Category</th>
                      <th className="px-2 py-2 text-left text-[10px] font-bold uppercase text-[#9AAAC5]">UOM</th>
                      <th className="px-2 py-2 text-right text-[10px] font-bold uppercase text-[#9AAAC5]">Est. Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-[#F4F7FE]" style={{ borderColor: "#F0F3FA" }}>
                        <td className="px-2 py-1">
                          <input
                            type="checkbox"
                            checked={selectedProdIds.includes(p.id)}
                            onChange={(e) =>
                              setSelectedProdIds((prev) =>
                                e.target.checked ? [...prev, p.id] : prev.filter((x) => x !== p.id),
                              )
                            }
                          />
                        </td>
                        <td className="px-2 py-1">{p.name}</td>
                        <td className="px-2 py-1 text-[#6B80A0]">{p.categoryName}</td>
                        <td className="px-2 py-1">{p.uom}</td>
                        <td className="px-2 py-1 text-right tabular-nums">{formatCurrency(p.estimatedUnitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQuickProduct && (
        <div className="fixed inset-0 z-[60] bg-black/35 flex justify-end">
          <div className="w-full max-w-md bg-white h-full border-l border-[#DDE3EF] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-[#0A1628]">Create Product</h3>
              <button type="button" className="p-1.5 hover:bg-[#F4F7FE] rounded-[9px]" onClick={() => setShowQuickProduct(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <ProcInput placeholder="Product Name" value={quickProduct.name} onChange={(e) => setQuickProduct((p) => ({ ...p, name: e.target.value }))} />
              <ProcInput placeholder="Product Code" value={quickProduct.code} onChange={(e) => setQuickProduct((p) => ({ ...p, code: e.target.value }))} />
              <ProcInput placeholder="Category" value={quickProduct.categoryName} onChange={(e) => setQuickProduct((p) => ({ ...p, categoryName: e.target.value }))} />
              <ProcInput placeholder="UOM" value={quickProduct.uom} onChange={(e) => setQuickProduct((p) => ({ ...p, uom: e.target.value }))} />
              <ProcTextarea rows={3} placeholder="Description" value={quickProduct.description} onChange={(e) => setQuickProduct((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <ProcButton variant="outline" onClick={() => setShowQuickProduct(false)}>Cancel</ProcButton>
              <ProcButton
                variant="primary"
                onClick={() => {
                  if (!quickProduct.name.trim() || !quickProduct.code.trim()) return;
                  const created = addProcurementProduct({
                    code: quickProduct.code.trim(),
                    name: quickProduct.name.trim(),
                    categoryName: quickProduct.categoryName.trim() || "General",
                    uom: quickProduct.uom.trim() || "PCS",
                    description: quickProduct.description.trim(),
                    estimatedUnitPrice: 0,
                  });
                  setSelectedProdIds((p) => [...p, created.id]);
                  setQuickProduct({ name: "", code: "", categoryName: "", uom: "", description: "" });
                  setShowQuickProduct(false);
                }}
              >
                Save Product
              </ProcButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
