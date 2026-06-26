"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Eye, Plus, Trash2, Upload } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import {
  applyReturnQtyToDebitLines,
  buildReferenceFromPurchaseInvoice,
  buildReferenceFromPurchaseOrder,
  buildReferenceFromQc,
  listQcsForDebit,
  canUseStandaloneDebit,
  computeDebitTotals,
  computeLineDebitAmount,
  createDebitNote,
  createEmptyDebitLine,
  DEBIT_REASONS,
  getDebitNoteById,
  getVendorsForDebitNote,
  listCreditablePurchaseInvoices,
  listPurchaseOrdersForDebit,
  newDebitAttachmentId,
  normalizeDebitLine,
  previewToDebitForm,
  updateDebitNote,
  type DebitNoteAgainst,
  type DebitNoteAttachment,
  type DebitNoteLine,
  type DebitReferencePreview,
  type NoteWorkflowStatus,
} from "./debit-notes-data";
import { DEBIT_NOTES_BREADCRUMB, DEBIT_NOTES_LIST_PATH, formatINR } from "./note-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { VendorMasterPanel } from "@/components/accounts/master-fetch/VendorMasterPanel";
import {
  vendorMasterToTransactionFields,
  type VendorTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

function CompactInfoCard({ rows }: { rows: { label: string; value: string }[] }) {
  const visible = rows.filter((r) => r.value.trim());
  if (!visible.length) return null;
  return (
    <div className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
      {visible.map((r) => (
        <div key={r.label}>
          <span className="text-muted-foreground">{r.label}: </span>
          <span className="font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function DebitNoteFormPageClient({ debitNoteId }: { debitNoteId?: number }) {
  const router = useRouter();
  const isEdit = debitNoteId != null;
  const vendors = useMemo(() => getVendorsForDebitNote(), []);
  const invoices = useMemo(() => listCreditablePurchaseInvoices(), []);
  const pos = useMemo(() => listPurchaseOrdersForDebit(), []);
  const qcs = useMemo(() => listQcsForDebit(), []);
  const [referenceMode, setReferenceMode] = useState<"purchase_invoice" | "purchase_order" | "qc_rejected">("purchase_invoice");

  const [debitNoteNo, setDebitNoteNo] = useState("");
  const [debitNoteDate, setDebitNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [vendorId, setVendorId] = useState("");
  const [vendorFields, setVendorFields] = useState<VendorTransactionFields | null>(null);
  const [billToId, setBillToId] = useState("");
  const [shipToId, setShipToId] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [referenceType, setReferenceType] = useState<DebitNoteAgainst>("purchase_invoice");
  const [referenceSelectionId, setReferenceSelectionId] = useState("");
  const [referencePreview, setReferencePreview] = useState<DebitReferencePreview | null>(null);
  const [sourceInvoiceId, setSourceInvoiceId] = useState<number | null>(null);
  const [sourcePoId, setSourcePoId] = useState<number | null>(null);
  const [originalAmount, setOriginalAmount] = useState("");
  const [alreadyAdjusted, setAlreadyAdjusted] = useState("0");
  const [standaloneAmount, setStandaloneAmount] = useState("");
  const [lines, setLines] = useState<DebitNoteLine[]>([]);
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState<DebitNoteAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const piOptions = useMemo(
    () =>
      invoices.map((inv) => ({
        value: String(inv.id),
        label: inv.vendorInvoiceNo ? `${inv.vendorInvoiceNo} (${inv.invoiceNo})` : inv.invoiceNo,
        sub: `${inv.vendorName} · ${inv.invoiceDate} · ${formatINR(inv.grandTotal)}`,
      })),
    [invoices],
  );

  const poOptions = useMemo(
    () =>
      pos.map((p) => ({
        value: String(p.id),
        label: p.poNumber,
        sub: `${p.supplierName} · ${p.poDate} · ${formatINR(p.summary?.grandTotal ?? 0)}`,
      })),
    [pos],
  );

  const qcOptions = useMemo(
    () =>
      qcs.map((q) => ({
        value: q.id,
        label: q.qcNo,
        sub: `${q.grnNo} · ${q.poNumber} · ${q.rejectedQty} rejected`,
      })),
    [qcs],
  );

  const onVendorChange = (id: string, fields: VendorTransactionFields | null) => {
    setVendorId(id);
    if (!fields) {
      setVendorFields(null);
      return;
    }
    setVendorFields(fields);
    setBillToId(fields.defaultBillToId);
    setShipToId(fields.defaultShipToId);
    setBillingAddress(fields.billingAddress);
    setShippingAddress(fields.shippingAddress);
  };

  const selectedVendor = vendors.find((v) => v.id === Number(vendorId));
  const alreadyAdjustedNum = parseFloat(alreadyAdjusted) || 0;

  const applyPreview = (preview: DebitReferencePreview) => {
    setReferencePreview(preview);
    const pre = previewToDebitForm(preview);
    setSourceInvoiceId(pre.sourceInvoiceId ?? null);
    setSourcePoId(pre.sourcePoId ?? null);
    if (pre.vendorId) {
      const v = vendors.find((x) => x.id === pre.vendorId);
      if (v) onVendorChange(String(pre.vendorId), vendorMasterToTransactionFields(v));
      else setVendorId(String(pre.vendorId));
    }
    setOriginalAmount(String(pre.originalAmount ?? ""));
    setAlreadyAdjusted(String(pre.alreadyAdjustedAmount ?? 0));
    if (pre.lineItems?.length) {
      const normalized = pre.lineItems.map((l) => normalizeDebitLine(l));
      setLines(normalized);
    }
  };

  const clearReference = () => {
    setReferenceSelectionId("");
    setReferencePreview(null);
    setSourceInvoiceId(null);
    setSourcePoId(null);
    setOriginalAmount("");
    setAlreadyAdjusted("0");
    setLines([]);
  };

  const onReferenceTypeChange = (type: DebitNoteAgainst) => {
    setReferenceType(type);
    setReferenceMode(type === "purchase_order" ? "purchase_order" : "purchase_invoice");
    clearReference();
    if (type === "standalone_adjustment") setLines([]);
  };

  const onReferenceModeChange = (mode: "purchase_invoice" | "purchase_order" | "qc_rejected") => {
    setReferenceMode(mode);
    clearReference();
    if (mode === "qc_rejected") setReferenceType("purchase_order");
  };

  const onReferenceSelect = (id: string) => {
    setReferenceSelectionId(id);
    if (!id) {
      clearReference();
      return;
    }
    const preview =
      referenceMode === "purchase_invoice"
        ? buildReferenceFromPurchaseInvoice(Number(id))
        : referenceMode === "purchase_order"
          ? buildReferenceFromPurchaseOrder(Number(id))
          : buildReferenceFromQc(id);
    if (preview) applyPreview(preview);
  };

  useEffect(() => {
    if (!isEdit || debitNoteId == null) return;
    const rec = getDebitNoteById(debitNoteId);
    if (!rec) {
      router.replace(DEBIT_NOTES_LIST_PATH);
      return;
    }
    setDebitNoteNo(rec.debitNoteNo);
    setDebitNoteDate(rec.debitNoteDate);
    setReferenceType(rec.againstType);
    setVendorId(rec.vendorId ? String(rec.vendorId) : "");
    if (rec.vendorId) {
      const v = vendors.find((x) => x.id === rec.vendorId);
      if (v) onVendorChange(String(rec.vendorId), vendorMasterToTransactionFields(v));
    }
    setSourceInvoiceId(rec.sourceInvoiceId);
    setSourcePoId(rec.sourcePoId);
    setOriginalAmount(String(rec.originalAmount));
    setAlreadyAdjusted(String(rec.alreadyAdjustedAmount));
    setStandaloneAmount(String(rec.standaloneDebitAmount || rec.currentDebitAmount));
    setLines(rec.lineItems.map((l) => normalizeDebitLine(l)));
    setReason(rec.reason);
    setRemarks(rec.remarks);
    setAttachments(rec.attachments ?? []);

    if (rec.sourceInvoiceId) {
      setReferenceSelectionId(String(rec.sourceInvoiceId));
      const p = buildReferenceFromPurchaseInvoice(rec.sourceInvoiceId);
      if (p) setReferencePreview(p);
    } else if (rec.sourcePoId) {
      setReferenceSelectionId(String(rec.sourcePoId));
      const p = buildReferenceFromPurchaseOrder(rec.sourcePoId);
      if (p) setReferencePreview(p);
    }
  }, [isEdit, debitNoteId, router]);

  const lineTotals = useMemo(() => computeDebitTotals(lines), [lines]);
  const totalDebit =
    referenceType === "standalone_adjustment"
      ? parseFloat(standaloneAmount) || 0
      : lineTotals.total;
  const original = parseFloat(originalAmount) || totalDebit;

  const resolveVendorName = (): string => {
    if (selectedVendor) return selectedVendor.vendorName;
    if (referencePreview?.vendorName) return referencePreview.vendorName;
    return "";
  };

  const updateLine = (id: string, patch: Partial<DebitNoteLine>) => {
    if ("returnQty" in patch) {
      setLines((prev) => applyReturnQtyToDebitLines(prev, id, patch.returnQty ?? 0, alreadyAdjustedNum));
      return;
    }
    setLines((prev) => {
      const merged = prev.map((l) => (l.id === id ? { ...l, ...patch } : l));
      if ("unitPrice" in patch || "taxPct" in patch) {
        return merged.map((l) =>
          l.id === id
            ? { ...l, debitAmount: computeLineDebitAmount(l, merged, alreadyAdjustedNum) }
            : l,
        );
      }
      return merged;
    });
  };

  const handleFile = (file: File, documentName: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachments((prev) => [
        ...prev,
        {
          id: newDebitAttachmentId(),
          documentName: documentName.trim() || file.name,
          fileName: file.name,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    };
    reader.readAsDataURL(file);
  };

  const buildInput = (status: NoteWorkflowStatus) => ({
    debitNoteDate,
    againstType: referenceType,
    vendorId: vendorId ? Number(vendorId) : null,
    vendorName: resolveVendorName(),
    sourceInvoiceId: referenceType === "purchase_invoice" ? sourceInvoiceId : null,
    sourceInvoiceNo: referencePreview?.sourceInvoiceNo ?? "",
    sourcePoId: referenceType === "purchase_order" ? sourcePoId : referencePreview?.sourcePoId ?? null,
    sourcePoNo: referencePreview?.sourcePoNo ?? "",
    sourceGrnNo: referencePreview?.sourceGrnNo ?? "",
    sourceQcNo: referencePreview?.sourceQcNo ?? "",
    originalAmount: original,
    alreadyAdjustedAmount: alreadyAdjustedNum,
    standaloneDebitAmount: referenceType === "standalone_adjustment" ? parseFloat(standaloneAmount) || 0 : 0,
    lineItems: lines.filter((l) => l.productName || l.debitAmount > 0),
    reason,
    remarks,
    attachments,
    status,
  });

  const submit = (status: NoteWorkflowStatus) => {
    setError(null);
    try {
      if (isEdit && debitNoteId != null) {
        updateDebitNote(debitNoteId, buildInput(status));
        router.push(`${DEBIT_NOTES_LIST_PATH}/${debitNoteId}`);
      } else {
        const rec = createDebitNote(buildInput(status));
        router.push(`${DEBIT_NOTES_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Debit Note" : "Create Debit Note"}
      breadcrumb={[...DEBIT_NOTES_BREADCRUMB]}
      code={debitNoteNo || undefined}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(DEBIT_NOTES_LIST_PATH)}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => submit("draft")}>
            Save as Draft
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => submit("pending_approval")}>
            Save & Submit
          </Button>
        </div>
      }
    >
      <div className="space-y-4 pb-8 w-full">
        <div className="space-y-4">
          <Section title="Basic Details">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Debit Note No.</Label>
                <Input className="h-8 text-xs bg-muted/30" disabled value={isEdit ? debitNoteNo : "Auto-generated"} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Debit Note Date *</Label>
                <Input type="date" className="h-8 text-xs" value={debitNoteDate} onChange={(e) => setDebitNoteDate(e.target.value)} />
              </div>
            </div>
            <VendorMasterPanel
              vendors={vendors}
              vendorId={vendorId}
              onVendorIdChange={onVendorChange}
              fields={vendorFields}
              billToId={billToId}
              shipToId={shipToId}
              onBillToChange={(id, addr) => {
                setBillToId(id);
                setBillingAddress(addr);
              }}
              onShipToChange={(id, addr) => {
                setShipToId(id);
                setShippingAddress(addr);
              }}
              billingAddress={billingAddress}
              shippingAddress={shippingAddress}
              disabled={referenceType !== "standalone_adjustment" && !!referencePreview}
            />
          </Section>

          <Section title="Reference Details">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Reference Type</Label>
                <Select value={referenceType} onValueChange={(v) => onReferenceTypeChange(v as DebitNoteAgainst)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_invoice" className="text-xs">Purchase Invoice</SelectItem>
                    <SelectItem value="purchase_order" className="text-xs">Purchase Order</SelectItem>
                    {canUseStandaloneDebit() && (
                      <SelectItem value="standalone_adjustment" className="text-xs">Standalone Adjustment</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {referenceType === "purchase_invoice" && (
                <SearchableSelect
                  label="Select Purchase Invoice"
                  value={referenceSelectionId}
                  onChange={(id) => {
                    setReferenceMode("purchase_invoice");
                    onReferenceSelect(id);
                  }}
                  options={piOptions}
                  placeholder="Search invoice…"
                />
              )}
              {referenceType === "purchase_order" && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">PO Source</Label>
                    <Select value={referenceMode} onValueChange={(v) => onReferenceModeChange(v as typeof referenceMode)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="purchase_order" className="text-xs">Purchase Order</SelectItem>
                        <SelectItem value="qc_rejected" className="text-xs">QC Rejected Quantity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {referenceMode === "purchase_order" ? (
                    <SearchableSelect label="Select Purchase Order" value={referenceSelectionId} onChange={onReferenceSelect} options={poOptions} placeholder="Search PO…" />
                  ) : (
                    <SearchableSelect label="Select QC Record" value={referenceSelectionId} onChange={onReferenceSelect} options={qcOptions} placeholder="Search QC…" />
                  )}
                </div>
              )}
            </div>
            {referencePreview && referenceType !== "standalone_adjustment" && (
              <CompactInfoCard
                rows={
                  referencePreview.referenceType === "purchase_invoice"
                    ? [
                        { label: "Supplier", value: referencePreview.vendorName },
                        { label: "Invoice Date", value: referencePreview.documentDate },
                        { label: "PI No.", value: referencePreview.sourceInvoiceNo },
                        { label: "PO No.", value: referencePreview.sourcePoNo },
                        { label: "GRN No.", value: referencePreview.sourceGrnNo },
                        { label: "QC Ref.", value: referencePreview.sourceQcNo },
                        { label: "Invoice Amount", value: formatINR(referencePreview.originalAmount) },
                        { label: "GST", value: formatINR(referencePreview.taxAmount) },
                        { label: "Already Debited", value: formatINR(referencePreview.alreadyAdjustedAmount) },
                      ]
                    : [
                        { label: "Supplier", value: referencePreview.vendorName },
                        { label: "PO Date", value: referencePreview.documentDate },
                        { label: "PO No.", value: referencePreview.sourcePoNo },
                        { label: "PI No.", value: referencePreview.sourceInvoiceNo },
                        { label: "GRN No.", value: referencePreview.sourceGrnNo },
                        { label: "QC Ref.", value: referencePreview.sourceQcNo },
                        { label: "PO Amount", value: formatINR(referencePreview.originalAmount) },
                        { label: "GST", value: formatINR(referencePreview.taxAmount) },
                      ]
                }
              />
            )}
            {referenceType === "standalone_adjustment" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs">Debit Amount *</Label>
                  <Input type="number" className="h-8 text-xs" value={standaloneAmount} onChange={(e) => setStandaloneAmount(e.target.value)} />
                </div>
              </div>
            )}
          </Section>

          <Section title="Reason">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Reason *</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {DEBIT_REASONS.map((r) => (
                      <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>

          {referenceType !== "standalone_adjustment" && lines.length > 0 && (
            <Section title="Product / Adjustment Details">
              <p className="text-[10px] text-muted-foreground -mt-1">
                Enter return qty — debit amount auto-calculates. Rate and GST % are editable.
              </p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-xs min-w-[1000px]">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      {["Product", "Inv Qty", "Return Qty", "UOM", "Rate", "GST %", "Debit Amt", "Line Remarks", ""].map((h) => (
                        <th key={h || "x"} className="px-2 py-1.5 text-left text-[10px] uppercase text-muted-foreground font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b border-border/40">
                        <td className="p-1.5"><Input className="h-7 text-xs min-w-[100px] bg-muted/10" readOnly value={l.productName} /></td>
                        <td className="p-1.5"><Input className="h-7 w-14 text-xs bg-muted/10" readOnly value={l.invoiceQty || ""} /></td>
                        <td className="p-1.5"><Input type="number" className="h-7 w-16 text-xs" value={l.returnQty || ""} onChange={(e) => updateLine(l.id, { returnQty: parseFloat(e.target.value) || 0 })} /></td>
                        <td className="p-1.5"><Input className="h-7 w-12 text-xs bg-muted/10" readOnly value={l.uom} /></td>
                        <td className="p-1.5"><Input type="number" className="h-7 w-16 text-xs" value={l.unitPrice || ""} onChange={(e) => updateLine(l.id, { unitPrice: parseFloat(e.target.value) || 0 })} /></td>
                        <td className="p-1.5"><Input type="number" className="h-7 w-12 text-xs" value={l.taxPct || ""} onChange={(e) => updateLine(l.id, { taxPct: parseFloat(e.target.value) || 0 })} /></td>
                        <td className="p-1.5"><Input type="number" className="h-7 w-20 text-xs bg-muted/10" readOnly value={l.debitAmount > 0 ? l.debitAmount : ""} /></td>
                        <td className="p-1.5"><Input className="h-7 text-xs min-w-[80px]" value={l.lineRemarks} onChange={(e) => updateLine(l.id, { lineRemarks: e.target.value })} /></td>
                        <td className="p-1.5">
                          <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-600" onClick={() => lines.length > 1 && setLines(lines.filter((x) => x.id !== l.id))}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setLines([...lines, createEmptyDebitLine()])}>
                <Plus className="w-3 h-3" /> Add Row
              </Button>
            </Section>
          )}

          <Section title="Attachments">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <Label className="text-xs">Document Name</Label>
                <Input id="dn-doc-name" className="h-8 text-xs" placeholder="e.g. Return proof" />
              </div>
              <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border rounded-lg cursor-pointer hover:bg-muted/40">
                <Upload className="w-3.5 h-3.5" /> Upload
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const name = (document.getElementById("dn-doc-name") as HTMLInputElement)?.value;
                    handleFile(f, name);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {attachments.map((att) => (
                  <div key={att.id} className="flex items-center gap-2 py-1.5 px-2 border rounded text-xs">
                    <span className="font-medium">{att.documentName}</span>
                    <span className="text-muted-foreground truncate flex-1">{att.fileName}</span>
                    {att.dataUrl && (
                      <>
                        <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(att.dataUrl, "_blank")}><Eye className="w-3.5 h-3.5" /></button>
                        <a href={att.dataUrl} download={att.fileName} className="p-1 hover:bg-muted rounded"><Download className="w-3.5 h-3.5" /></a>
                      </>
                    )}
                    <button type="button" className="p-1 hover:bg-red-50 text-red-600 rounded" onClick={() => setAttachments((p) => p.filter((a) => a.id !== att.id))}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Remarks">
            <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks (required)…" />
          </Section>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/40">
          <div className="rounded-lg border border-border/60 bg-white p-4 space-y-2 text-xs">
            <h2 className="text-xs font-semibold uppercase text-muted-foreground">Summary</h2>
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span className="tabular-nums">{formatINR(referenceType === "standalone_adjustment" ? totalDebit : lineTotals.taxableAmount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">GST Amount</span><span className="tabular-nums">{formatINR(lineTotals.gstAmount)}</span></div>
            <div className="flex justify-between font-semibold text-brand-700 pt-2 border-t"><span>Total Debit</span><span className="tabular-nums">{formatINR(totalDebit)}</span></div>
            {referenceType !== "standalone_adjustment" && original > 0 && (
              <div className="flex justify-between text-muted-foreground pt-1"><span>Balance After</span><span className="tabular-nums">{formatINR(Math.max(0, original - alreadyAdjustedNum - totalDebit))}</span></div>
            )}
          </div>
          <LedgerImpactPreview
            lines={debitNoteImpactResolved({
              vendorName: vendors.find((v) => String(v.id) === vendorId)?.vendorName ?? "Supplier",
              taxable:
                referenceType === "standalone_adjustment"
                  ? totalDebit - lineTotals.gstAmount
                  : lineTotals.taxableAmount,
              taxAmount: lineTotals.gstAmount,
              grandTotal: totalDebit,
            })}
          />
        </div>
      </div>
    </AccountsFormLayout>
  );
}
