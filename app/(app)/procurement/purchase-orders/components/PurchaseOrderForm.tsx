"use client";

import React, { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  X,
  ChevronDown,
  Plus,
  Search,
  Upload,
  Trash2,
  Download,
  Eye,
} from "lucide-react";
import { COMPANY_BILLING, PAYMENT_TERMS_OPTIONS } from "@/lib/procurement/config";
import {
  addProcurementProduct,
  loadProcurementProducts,
  type ProcurementProduct,
} from "@/lib/procurement/products-data";
import { formatCurrency } from "@/lib/procurement/utils";
import { getActiveSuppliers } from "../../masters/suppliers/supplier-data";
import { getDefaultTermsFor, loadTermsMasters } from "../../masters/terms/terms-data";
import { getPRById, loadPurchaseRequests } from "../../purchase-requests/pr-data";
import { loadWarehouseLocations } from "@/app/(app)/masters/warehouse/warehouse-data";
import type { POLineItem, POAttachment, POTerm, PurchaseOrder } from "../po-data";
import { recalcPO } from "../po-data";

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

function Card({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-white border border-border/70 rounded-lg", className)}>
      <div className="px-4 py-2.5 border-b border-border/60">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-border/70 rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/20"
      >
        <span className="text-xs font-semibold">{title}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-4 pb-4 border-t border-border/60 pt-4">{children}</div>}
    </section>
  );
}

const fieldClass =
  "h-9 text-sm border-border/70 rounded-md bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30";

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
  const defaultTerms = getDefaultTermsFor("po").map((t) => ({
    uid: `t-${t.id}`,
    termId: t.id,
    title: t.termTitle,
    content: t.termContent,
    isCustom: false,
  }));

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
    terms: defaultTerms,
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
}: {
  form: POFormValues;
  onChange: (f: POFormValues) => void;
  poNumber?: string;
  readOnly?: boolean;
}) {
  const [showProductModal, setShowProductModal] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [prodCategory, setProdCategory] = useState("");
  const [selectedProdIds, setSelectedProdIds] = useState<number[]>([]);
  const [customTermTitle, setCustomTermTitle] = useState("");
  const [customTermContent, setCustomTermContent] = useState("");
  const [selectedMasterTermId, setSelectedMasterTermId] = useState("");
  const [openAttach, setOpenAttach] = useState(false);
  const [openRemarks, setOpenRemarks] = useState(false);
  const [openTerms, setOpenTerms] = useState(false);
  const [quickProduct, setQuickProduct] = useState({
    name: "",
    code: "",
    categoryName: "",
    uom: "",
    description: "",
  });

  const products = loadProcurementProducts();
  const suppliers = getActiveSuppliers();
  const locations = loadWarehouseLocations();
  const prList = loadPurchaseRequests().filter((p) =>
    ["approved", "partially_converted"].includes(p.status),
  );
  const termsMaster = loadTermsMasters().filter(
    (t) => t.status === "active" && (t.applicableTo === "po" || t.applicableTo === "both"),
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

  const supplier = suppliers.find((s) => s.id === form.supplierId);
  const categories = Array.from(new Set(products.map((p) => p.categoryName)));
  const canAddCustomTerms = true;
  const selectedLocation =
    locations.find((l) => l.name === form.shipping.shipToLocation) ??
    locations.find((l) => l.code === form.shipping.branch);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4">
      <div className="space-y-4">
        <Card title="Purchase Order Type">
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={poType === "pr"}
                disabled={readOnly}
                onChange={() => setType("pr")}
              />
              From Purchase Request
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={poType === "direct"}
                disabled={readOnly}
                onChange={() => setType("direct")}
              />
              Direct Purchase Order
            </label>
          </div>
        </Card>

        <Card title="Basic Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">PO Date</Label>
              <Input
                type="date"
                className={fieldClass}
                disabled={readOnly}
                value={form.poDate}
                onChange={(e) => patch({ poDate: e.target.value })}
              />
            </div>
            {poType === "pr" ? (
              <>
              <div className="space-y-1">
                <Label className="text-xs">Purchase Request Number</Label>
                <select
                  className={cn(fieldClass, "w-full px-2")}
                  disabled={readOnly}
                  value={form.sourcePrId ?? ""}
                  onChange={(e) => loadFromPR(Number(e.target.value))}
                >
                  <option value="">Select approved PR</option>
                  {prList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.prNumber} - {p.requestedBy}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Supplier *</Label>
                <select
                  className={cn(fieldClass, "w-full px-2")}
                  disabled={readOnly}
                  value={form.supplierId || ""}
                  onChange={(e) => {
                    const s = suppliers.find((x) => x.id === Number(e.target.value));
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
                  }}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplierName}
                    </option>
                  ))}
                </select>
              </div>
              </>
            ) : (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs">Vendor Name *</Label>
                <select
                  className={cn(fieldClass, "w-full px-2")}
                  disabled={readOnly}
                  value={form.supplierId || ""}
                  onChange={(e) => {
                    const s = suppliers.find((x) => x.id === Number(e.target.value));
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
                  }}
                >
                  <option value="">Select vendor</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplierName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </Card>

        {supplier && (
          <Card title="Vendor Information">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Vendor</p>
                <p className="font-medium">{form.supplierName || supplier.supplierName}</p>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Contact Person</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  disabled={readOnly}
                  value={form.supplierContactPerson || ""}
                  onChange={(e) => patch({ supplierContactPerson: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Mobile</Label>
                <div className="mt-1">
                  <PhoneInput
                    countryCode={form.supplierMobileCountry || "+91"}
                    onCountryCodeChange={(v) => patch({ supplierMobileCountry: v })}
                    value={form.supplierMobile || ""}
                    onChange={(v) => patch({ supplierMobile: v })}
                    disabled={readOnly}
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">GSTIN</Label>
                <Input
                  className="h-8 text-xs mt-1 font-mono"
                  disabled={readOnly}
                  value={form.supplierGstin || ""}
                  onChange={(e) => patch({ supplierGstin: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Email</Label>
                <Input
                  className="h-8 text-xs mt-1"
                  disabled={readOnly}
                  value={form.supplierEmail || ""}
                  onChange={(e) => patch({ supplierEmail: e.target.value })}
                />
              </div>
            </div>
          </Card>
        )}

        <Card title="Products">
          {poType === "direct" && form.lines.length === 0 && !readOnly ? (
            <div className="py-8 text-center border border-dashed rounded-md">
              <p className="text-sm text-muted-foreground">No products added</p>
              <Button
                type="button"
                size="sm"
                className="h-9 mt-3 bg-brand-600 text-white"
                onClick={() => setShowProductModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {poType === "direct" && !readOnly && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setShowProductModal(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                </Button>
              )}
              <div className="overflow-x-auto border border-border/70 rounded-md">
                <table className="w-full min-w-[900px] text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border/70">
                      <th className="px-2 py-2 text-left font-medium">Product Name</th>
                      <th className="px-2 py-2 font-medium">UOM</th>
                      <th className="px-2 py-2 font-medium">{poType === "pr" ? "Requested Qty" : "Quantity"}</th>
                      <th className="px-2 py-2 font-medium">Order Qty</th>
                      <th className="px-2 py-2 font-medium">Unit Price</th>
                      <th className="px-2 py-2 font-medium">Discount %</th>
                      <th className="px-2 py-2 font-medium">GST %</th>
                      <th className="px-2 py-2 font-medium">Amount</th>
                      {!readOnly && <th className="w-8" />}
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line) => (
                      <tr key={line.uid} className="border-b border-border/50 last:border-0 h-11">
                        <td className="px-2 py-1">{line.productName}</td>
                        <td className="px-2 py-1 text-center">{line.uom || "—"}</td>
                        <td className="px-2 py-1 text-center">{poType === "pr" ? line.orderedQty : "—"}</td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            disabled={readOnly}
                            value={line.orderedQty}
                            onChange={(e) => updateLine(line.uid, { orderedQty: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            disabled={readOnly}
                            value={line.unitPrice}
                            onChange={(e) => updateLine(line.uid, { unitPrice: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            disabled={readOnly}
                            value={line.discountPct}
                            onChange={(e) => updateLine(line.uid, { discountPct: Number(e.target.value) || 0 })}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input
                            type="number"
                            className="h-8 text-xs"
                            disabled={readOnly}
                            value={line.cgstPct + line.sgstPct + line.igstPct}
                            onChange={(e) => {
                              const gst = Number(e.target.value) || 0;
                              updateLine(line.uid, { cgstPct: gst / 2, sgstPct: gst / 2, igstPct: 0 });
                            }}
                          />
                        </td>
                        <td className="px-2 py-1 text-right font-semibold">{formatCurrency(line.netAmount)}</td>
                        {!readOnly && (
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-red-50 text-red-600"
                              onClick={() => patch({ lines: form.lines.filter((x) => x.uid !== line.uid) })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        <Card title="Delivery & Payment Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Delivery Date</Label>
              <Input
                type="date"
                className={fieldClass}
                disabled={readOnly}
                value={form.expectedDeliveryDate}
                onChange={(e) => patch({ expectedDeliveryDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Delivery Location</Label>
              <select
                className={cn(fieldClass, "w-full px-2")}
                disabled={readOnly}
                value={selectedLocation?.code ?? ""}
                onChange={(e) => {
                  const loc = locations.find((l) => l.code === e.target.value);
                  if (!loc) return;
                  patch({
                    shipping: {
                      ...form.shipping,
                      shipToLocation: loc.name,
                      branch: loc.code.toLowerCase(),
                      address: `${loc.address}, ${loc.city}, ${loc.state} - ${loc.pincode}`,
                    },
                  });
                }}
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Payment Terms</Label>
              <select
                className={cn(fieldClass, "w-full px-2")}
                disabled={readOnly}
                value={form.paymentTerms}
                onChange={(e) =>
                  patch({
                    paymentTerms: e.target.value,
                    creditDays: paymentTermDays(e.target.value),
                  })
                }
              >
                {PAYMENT_TERMS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Credit Days</Label>
              <Input
                type="number"
                className={fieldClass}
                disabled={readOnly}
                value={form.creditDays}
                onChange={(e) => patch({ creditDays: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Bill To</Label>
              <Input
                className={fieldClass}
                disabled={readOnly}
                value={form.billing.companyName}
                onChange={(e) => patch({ billing: { ...form.billing, companyName: e.target.value } })}
              />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Ship To</Label>
              <Input
                className={fieldClass}
                disabled={readOnly}
                value={form.shipping.shipToLocation}
                onChange={(e) => patch({ shipping: { ...form.shipping, shipToLocation: e.target.value } })}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Ship To Address</Label>
              <div className="mt-1 min-h-9 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {form.shipping.address || "Select delivery location to auto-fill address"}
              </div>
            </div>
          </div>
        </Card>

        <Accordion title="Attachments" open={openAttach} onToggle={() => setOpenAttach((v) => !v)}>
          <div className="space-y-2">
            {!readOnly && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() =>
                  patch({
                    attachments: [
                      ...form.attachments,
                      {
                        uid: `att-${Date.now()}`,
                        name: `Document ${form.attachments.length + 1}`,
                        size: "100 KB",
                        uploadedAt: new Date().toISOString().slice(0, 10),
                        uploadedBy: "Admin",
                      } as POAttachment,
                    ],
                  })
                }
              >
                <Upload className="w-3.5 h-3.5 mr-1" /> Add Document
              </Button>
            )}
            {form.attachments.map((a) => (
              <div
                key={a.uid}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center border border-border/60 rounded-md p-2"
              >
                <Input
                  className="h-8 text-xs"
                  disabled={readOnly}
                  value={a.name}
                  onChange={(e) =>
                    patch({
                      attachments: form.attachments.map((x) =>
                        x.uid === a.uid ? { ...x, name: e.target.value } : x,
                      ),
                    })
                  }
                />
                <button className="p-1.5 hover:bg-muted rounded">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button className="p-1.5 hover:bg-muted rounded">
                  <Download className="w-3.5 h-3.5" />
                </button>
                {!readOnly && (
                  <button
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    onClick={() =>
                      patch({ attachments: form.attachments.filter((x) => x.uid !== a.uid) })
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            {form.attachments.length === 0 && (
              <p className="text-xs text-muted-foreground">No attachments added.</p>
            )}
          </div>
        </Accordion>

        <Accordion title="Remarks" open={openRemarks} onToggle={() => setOpenRemarks((v) => !v)}>
          <Textarea
            className="min-h-[90px] text-sm"
            disabled={readOnly}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Remarks"
          />
        </Accordion>

        <Accordion title="Terms & Conditions" open={openTerms} onToggle={() => setOpenTerms((v) => !v)}>
          <div className="space-y-2">
            {!readOnly && (
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                <select
                  className={cn(fieldClass, "w-full px-2")}
                  value={selectedMasterTermId}
                  onChange={(e) => setSelectedMasterTermId(e.target.value)}
                >
                  <option value="">Select terms from master</option>
                  {termsMaster.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.termTitle}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  className="h-9"
                  disabled={!selectedMasterTermId}
                  onClick={() => {
                    const t = termsMaster.find((x) => x.id === Number(selectedMasterTermId));
                    if (!t) return;
                    const already = form.terms.some((x) => x.termId === t.id && !x.isCustom);
                    if (already) return;
                    patch({
                      terms: [
                        ...form.terms,
                        {
                          uid: `term-${Date.now()}`,
                          termId: t.id,
                          title: t.termTitle,
                          content: t.termContent,
                          isCustom: false,
                        },
                      ],
                    });
                    setSelectedMasterTermId("");
                  }}
                >
                  Add Term
                </Button>
              </div>
            )}
            {canAddCustomTerms && !readOnly && (
              <div className="grid grid-cols-1 md:grid-cols-[220px_1fr_auto] gap-2">
                <Input
                  className={fieldClass}
                  placeholder="Custom title"
                  value={customTermTitle}
                  onChange={(e) => setCustomTermTitle(e.target.value)}
                />
                <Input
                  className={fieldClass}
                  placeholder="Custom term content"
                  value={customTermContent}
                  onChange={(e) => setCustomTermContent(e.target.value)}
                />
                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    if (!customTermTitle.trim() || !customTermContent.trim()) return;
                    patch({
                      terms: [
                        ...form.terms,
                        {
                          uid: `term-${Date.now()}`,
                          title: customTermTitle.trim(),
                          content: customTermContent.trim(),
                          isCustom: true,
                        } as POTerm,
                      ],
                    });
                    setCustomTermTitle("");
                    setCustomTermContent("");
                  }}
                >
                  Add
                </Button>
              </div>
            )}
            {form.terms.map((t) => (
              <div key={t.uid} className="border border-border/60 rounded-md p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold">{t.title}</p>
                  {!readOnly && (
                    <button
                      className="p-1 rounded hover:bg-red-50 text-red-600"
                      onClick={() => patch({ terms: form.terms.filter((x) => x.uid !== t.uid) })}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.content}</p>
              </div>
            ))}
          </div>
        </Accordion>
      </div>

      <aside className="xl:sticky xl:top-28 h-fit bg-white border border-border/70 rounded-lg p-4 space-y-3">
        <div className="rounded-md border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3.5">
          <h3 className="text-xs font-semibold text-brand-800">Payment Summary</h3>
          <p className="text-[11px] text-brand-700/80 mt-0.5">Live totals update as you edit lines</p>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2">
            <span className="text-muted-foreground">Sub Total</span>
            <span className="font-medium">{formatCurrency(preview.summary.grossAmount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium">{formatCurrency(preview.summary.totalDiscount)}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border/60 px-2.5 py-2">
            <span className="text-muted-foreground">GST</span>
            <span className="font-medium">{formatCurrency(preview.summary.totalCgst + preview.summary.totalSgst + preview.summary.totalIgst)}</span>
          </div>
          <div className="rounded-md border border-border/60 px-2.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Other Charges</span>
              <Input
                type="number"
                className="h-8 w-24 text-xs text-right"
                disabled={readOnly}
                value={form.otherCharges}
                onChange={(e) => patch({ otherCharges: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
        <div className="rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-brand-800 font-medium">Grand Total</span>
            <span className="text-base font-semibold text-brand-700">{formatCurrency(preview.summary.grandTotal)}</span>
          </div>
        </div>
      </aside>

      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-border w-full max-w-4xl max-h-[85vh] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">Select Products</h3>
              <button className="p-1.5 hover:bg-muted rounded" onClick={() => setShowProductModal(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    className="h-9 pl-8"
                    placeholder="Search product"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                  />
                </div>
                <select
                  className={cn(fieldClass, "w-full px-2")}
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button variant="outline" className="h-9" onClick={() => setShowQuickProduct(true)}>
                  Create Product
                </Button>
                <Button className="h-9 bg-brand-600 text-white" onClick={addSelectedProducts}>
                  Add Selected Products
                </Button>
              </div>
              <div className="border border-border/70 rounded-md overflow-auto max-h-[48vh]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/20 border-b border-border/60">
                      <th className="px-2 py-2 w-8" />
                      <th className="px-2 py-2 text-left">Product</th>
                      <th className="px-2 py-2 text-left">Category</th>
                      <th className="px-2 py-2 text-left">UOM</th>
                      <th className="px-2 py-2 text-right">Est. Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => (
                      <tr key={p.id} className="border-b border-border/40 last:border-0">
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
                        <td className="px-2 py-1 text-muted-foreground">{p.categoryName}</td>
                        <td className="px-2 py-1">{p.uom}</td>
                        <td className="px-2 py-1 text-right">{formatCurrency(p.estimatedUnitPrice)}</td>
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
          <div className="w-full max-w-md bg-white h-full border-l border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Create Product</h3>
              <button className="p-1.5 hover:bg-muted rounded" onClick={() => setShowQuickProduct(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Input className={fieldClass} placeholder="Product Name" value={quickProduct.name} onChange={(e) => setQuickProduct((p) => ({ ...p, name: e.target.value }))} />
              <Input className={fieldClass} placeholder="Product Code" value={quickProduct.code} onChange={(e) => setQuickProduct((p) => ({ ...p, code: e.target.value }))} />
              <Input className={fieldClass} placeholder="Category" value={quickProduct.categoryName} onChange={(e) => setQuickProduct((p) => ({ ...p, categoryName: e.target.value }))} />
              <Input className={fieldClass} placeholder="UOM" value={quickProduct.uom} onChange={(e) => setQuickProduct((p) => ({ ...p, uom: e.target.value }))} />
              <Textarea className="text-sm min-h-[80px]" placeholder="Description" value={quickProduct.description} onChange={(e) => setQuickProduct((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowQuickProduct(false)}>Cancel</Button>
              <Button
                className="bg-brand-600 text-white"
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
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
