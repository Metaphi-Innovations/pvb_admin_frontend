"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import {
  createPurchaseFromPOUpload,
  replacePurchaseFromPOUpload,
  newPurchaseAttachmentId,
  type PurchaseAttachment,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import type { PurchaseOrder } from "../po-data";
import { getPOVendorInvoice } from "../po-invoice-utils";

export function UploadVendorInvoiceDialog({
  open,
  onClose,
  po,
  onSaved,
  replaceMode = false,
}: {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
  onSaved: (purchaseId: number) => void;
  replaceMode?: boolean;
}) {
  const existing = getPOVendorInvoice(po.id);
  const isReplace = replaceMode || !!existing;

  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<PurchaseAttachment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const tax = po.summary.totalCgst + po.summary.totalSgst + po.summary.totalIgst;
    const defaultInvoice = String(po.summary.taxableValue || po.summary.grandTotal - tax);
    const inv = getPOVendorInvoice(po.id);

    if (isReplace && inv) {
      setVendorInvoiceNo(inv.vendorInvoiceNo);
      setVendorInvoiceDate(inv.invoiceDate);
      setInvoiceAmount(String(inv.subtotal));
      setTaxAmount(String(inv.taxAmount));
      setTotalAmount(String(inv.grandTotal));
      setRemarks(inv.remarks);
      setAttachment(inv.attachment);
    } else {
      setVendorInvoiceNo("");
      setVendorInvoiceDate(new Date().toISOString().slice(0, 10));
      setInvoiceAmount(defaultInvoice);
      setTaxAmount(String(tax));
      setTotalAmount(String(po.summary.grandTotal));
      setRemarks("");
      setAttachment(null);
    }
    setError(null);
  }, [open, po, isReplace]);

  const onAmountChange = (field: "invoice" | "tax" | "total", val: string) => {
    if (field === "invoice") setInvoiceAmount(val);
    if (field === "tax") setTaxAmount(val);
    if (field === "total") setTotalAmount(val);
    const inv = field === "invoice" ? parseFloat(val) : parseFloat(invoiceAmount);
    const tax = field === "tax" ? parseFloat(val) : parseFloat(taxAmount);
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
    setSaving(true);
    try {
      const input = {
        vendorInvoiceNo,
        vendorInvoiceDate,
        invoiceAmount: parseFloat(invoiceAmount) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        totalAmount: parseFloat(totalAmount) || 0,
        remarks,
        attachment,
      };
      const rec = isReplace
        ? replacePurchaseFromPOUpload(po.id, input)
        : createPurchaseFromPOUpload(po.id, input);
      onSaved(rec.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md z-[400]">
        <DialogHeader>
          <DialogTitle className="text-sm">{isReplace ? "Replace Vendor Invoice" : "Upload Vendor Invoice"}</DialogTitle>
          <DialogDescription className="text-xs">
            PO {po.poNumber} · {po.supplierName}. {isReplace ? "Updates" : "Creates"} Accounts → Purchase record.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Vendor Invoice No. *</Label>
            <Input className="h-8 text-xs" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vendor Invoice Date *</Label>
            <Input type="date" className="h-8 text-xs" value={vendorInvoiceDate} onChange={(e) => setVendorInvoiceDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice Amount *</Label>
            <Input type="number" className="h-8 text-xs" value={invoiceAmount} onChange={(e) => onAmountChange("invoice", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">GST Amount *</Label>
            <Input type="number" className="h-8 text-xs" value={taxAmount} onChange={(e) => onAmountChange("tax", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total Invoice Amount *</Label>
            <Input type="number" className="h-8 text-xs" value={totalAmount} onChange={(e) => onAmountChange("total", e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Upload Invoice File</Label>
            <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs border rounded-lg cursor-pointer hover:bg-muted/40 w-full justify-center">
              <Upload className="w-3.5 h-3.5" />
              {attachment ? attachment.fileName : "Choose file"}
              <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            </label>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Remarks</Label>
            <Textarea className="min-h-[56px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 text-white hover:bg-brand-700" disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
