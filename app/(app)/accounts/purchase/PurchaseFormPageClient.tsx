"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Eye, Trash2, Upload } from "lucide-react";
import { AccountsFormLayout } from "../expenses/components/AccountsFormLayout";
import { SearchableSelect } from "../credit-notes/components/SearchableSelect";
import {
  createManualPurchaseEntry,
  getPurchaseInvoiceById,
  getVendorsForPurchaseDropdown,
  newPurchaseAttachmentId,
  updateManualPurchaseEntry,
  type PurchaseAttachment,
} from "../purchase-invoices/purchase-invoices-data";
import {
  formatVendorDropdownLabel,
  formatVendorDropdownSublabel,
} from "@/lib/masters/entity-display";
import { formatINR, PURCHASE_BREADCRUMB, PURCHASE_LIST_PATH } from "./purchase-utils";
import { LedgerImpactPreview } from "@/components/accounts/LedgerImpactPreview";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function PurchaseFormPageClient({ purchaseId }: { purchaseId?: number }) {
  const router = useRouter();
  const isEdit = purchaseId != null;
  const vendors = useMemo(() => getVendorsForPurchaseDropdown(), []);

  const [purchaseNo, setPurchaseNo] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<PurchaseAttachment | null>(null);
  const [poRef, setPoRef] = useState("");
  const [grnRef, setGrnRef] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [branch, setBranch] = useState("Head Office");
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [error, setError] = useState<string | null>(null);

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: String(v.id),
        label: formatVendorDropdownLabel(v),
        sub: formatVendorDropdownSublabel(v),
      })),
    [vendors],
  );

  useEffect(() => {
    if (!isEdit || purchaseId == null) return;
    const rec = getPurchaseInvoiceById(purchaseId);
    if (!rec || rec.source !== "manual_entry") {
      router.replace(PURCHASE_LIST_PATH);
      return;
    }
    setPurchaseNo(rec.invoiceNo);
    setVendorId(String(rec.vendorId));
    setVendorInvoiceNo(rec.vendorInvoiceNo);
    setInvoiceDate(rec.invoiceDate);
    setInvoiceAmount(String(rec.subtotal));
    setTaxAmount(String(rec.taxAmount));
    setTotalAmount(String(rec.grandTotal));
    setRemarks(rec.remarks);
    setAttachment(rec.attachment);
  }, [isEdit, purchaseId, router]);

  const onAmountChange = (field: "invoice" | "tax" | "total", val: string) => {
    if (field === "invoice") setInvoiceAmount(val);
    if (field === "tax") setTaxAmount(val);
    if (field === "total") setTotalAmount(val);
    const inv = field === "invoice" ? parseFloat(val) : parseFloat(invoiceAmount);
    const tax = field === "tax" ? parseFloat(taxAmount) : parseFloat(taxAmount);
    if (field !== "total" && Number.isFinite(inv) && Number.isFinite(tax)) {
      setTotalAmount(String(Math.round((inv + tax) * 100) / 100));
    }
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        id: newPurchaseAttachmentId(),
        documentName: "Vendor Invoice",
        fileName: file.name,
        dataUrl: reader.result as string,
        uploadedAt: new Date().toISOString(),
      });
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    setError(null);
    const input = {
      vendorId: Number(vendorId),
      vendorInvoiceNo,
      invoiceDate,
      invoiceAmount: parseFloat(invoiceAmount) || 0,
      taxAmount: parseFloat(taxAmount) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      remarks,
      attachment,
    };
    try {
      if (isEdit && purchaseId != null) {
        updateManualPurchaseEntry(purchaseId, input);
        router.push(`${PURCHASE_LIST_PATH}/${purchaseId}`);
      } else {
        const rec = createManualPurchaseEntry(input);
        router.push(`${PURCHASE_LIST_PATH}/${rec.id}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    }
  };

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Manual Purchase" : "Manual Purchase Entry"}
      breadcrumb={[...PURCHASE_BREADCRUMB]}
      code={purchaseNo || undefined}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(PURCHASE_LIST_PATH)}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={submit}>
            Save Purchase
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-8 items-start">
        <div className="lg:col-span-2 max-w-[720px] space-y-4">
        <p className="text-[11px] text-muted-foreground">
          Use for exceptional cases only. Normal flow: upload vendor invoice on a PO in Procurement.
        </p>

        <Section title="Purchase Details">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Purchase No.</Label>
              <Input className="h-8 text-xs bg-muted/30" disabled value={isEdit ? purchaseNo : "Auto-generated"} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Source</Label>
              <Input className="h-8 text-xs bg-muted/30" disabled value="Manual Entry" />
            </div>
          </div>
          <SearchableSelect
            label="Vendor"
            value={vendorId}
            onChange={setVendorId}
            options={vendorOptions}
            placeholder="Select vendor…"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Vendor Invoice No. *</Label>
              <Input className="h-8 text-xs" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vendor Invoice Date *</Label>
              <Input type="date" className="h-8 text-xs" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Invoice Amount *</Label>
              <Input type="number" className="h-8 text-xs" value={invoiceAmount} onChange={(e) => onAmountChange("invoice", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tax Amount *</Label>
              <Input type="number" className="h-8 text-xs" value={taxAmount} onChange={(e) => onAmountChange("tax", e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Total Amount *</Label>
              <Input type="number" className="h-8 text-xs" value={totalAmount} onChange={(e) => onAmountChange("total", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PO Reference</Label>
              <Input className="h-8 text-xs font-mono" value={poRef} onChange={(e) => setPoRef(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GRN Reference</Label>
              <Input className="h-8 text-xs font-mono" value={grnRef} onChange={(e) => setGrnRef(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Due Date</Label>
              <Input type="date" className="h-8 text-xs" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Branch</Label>
              <Input className="h-8 text-xs" value={branch} onChange={(e) => setBranch(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Warehouse</Label>
              <Input className="h-8 text-xs" value={warehouse} onChange={(e) => setWarehouse(e.target.value)} />
            </div>
          </div>
        </Section>

        <Section title="Invoice Attachment">
          <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border rounded-lg cursor-pointer hover:bg-muted/40">
            <Upload className="w-3.5 h-3.5" /> Upload file
            <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </label>
          {attachment && (
            <div className="flex items-center gap-2 text-xs py-1.5 px-2 border rounded">
              <span className="truncate flex-1">{attachment.fileName}</span>
              {attachment.dataUrl && (
                <>
                  <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => window.open(attachment.dataUrl, "_blank")}><Eye className="w-3.5 h-3.5" /></button>
                  <a href={attachment.dataUrl} download={attachment.fileName} className="p-1 hover:bg-muted rounded"><Download className="w-3.5 h-3.5" /></a>
                </>
              )}
              <button type="button" className="p-1 text-red-600" onClick={() => setAttachment(null)}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
        </Section>

        <Section title="Remarks">
          <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Required…" />
        </Section>

        {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="lg:sticky lg:top-20 space-y-4">
          <LedgerImpactPreview
            lines={purchaseInvoiceImpactResolved({
              vendorName: vendorOptions.find((v) => v.value === vendorId)?.label ?? "Vendor",
              taxable: parseFloat(invoiceAmount) || 0,
              taxAmount: parseFloat(taxAmount) || 0,
              grandTotal: parseFloat(totalAmount) || 0,
            })}
          />
        </div>
      </div>
    </AccountsFormLayout>
  );
}
