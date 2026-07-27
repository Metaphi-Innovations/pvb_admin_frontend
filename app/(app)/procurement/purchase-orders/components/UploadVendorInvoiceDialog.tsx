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
import type { PurchaseOrder } from "../po-data";

export function UploadVendorInvoiceDialog({
  open,
  onClose,
  po,
  onSaved,
  submitting = false,
}: {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrder;
  onSaved: (input: {
    supplierInvoiceNo: string;
    supplierInvoiceDate: string;
    invoiceAmount: number;
    gstAmount: number;
    totalInvoiceAmount: number;
    remarks: string;
    file: File | null;
  }) => void;
  submitting?: boolean;
}) {
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [vendorInvoiceDate, setVendorInvoiceDate] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setVendorInvoiceNo("");
    setVendorInvoiceDate("");
    setInvoiceAmount("");
    setTaxAmount("");
    setTotalAmount("");
    setRemarks("");
    setFile(null);
    setFileName("");
    setError(null);
  }, [open]);

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

  const submit = () => {
    setError(null);
    if (!vendorInvoiceNo.trim()) {
      setError("Supplier invoice number is required.");
      return;
    }
    if (!vendorInvoiceDate) {
      setError("Supplier invoice date is required.");
      return;
    }
    onSaved({
      supplierInvoiceNo: vendorInvoiceNo.trim(),
      supplierInvoiceDate: vendorInvoiceDate,
      invoiceAmount: parseFloat(invoiceAmount) || 0,
      gstAmount: parseFloat(taxAmount) || 0,
      totalInvoiceAmount: parseFloat(totalAmount) || 0,
      remarks,
      file,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md z-[400]">
        <DialogHeader>
          <DialogTitle className="text-sm">Upload Supplier Invoice</DialogTitle>
          <DialogDescription className="text-xs">
            PO {po.poNumber} · {po.supplierName}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">Supplier Invoice No. *</Label>
            <Input className="h-8 text-xs" value={vendorInvoiceNo} onChange={(e) => setVendorInvoiceNo(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supplier Invoice Date *</Label>
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
              {fileName || "Choose file"}
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFile(f);
                    setFileName(f.name);
                  }
                  e.target.value = "";
                }}
              />
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
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 text-white hover:bg-brand-700"
            disabled={submitting}
            onClick={submit}
          >
            {submitting ? "Saving…" : "Save Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
