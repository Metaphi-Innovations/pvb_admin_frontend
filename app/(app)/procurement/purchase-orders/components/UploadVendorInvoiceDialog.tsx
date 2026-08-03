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
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "../po-data";
import {
  preventInvalidNumberKeys,
  sanitizeDecimalInput,
} from "./number-input-guards";

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

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
    setFieldErrors({});
  }, [open]);

  const onAmountChange = (field: "invoice" | "tax" | "total", val: string) => {
    const nextValue = sanitizeDecimalInput(val);
    if (field === "invoice") {
      setInvoiceAmount(nextValue);
      if (fieldErrors.invoiceAmount) {
        setFieldErrors((prev) => ({ ...prev, invoiceAmount: false }));
      }
    }
    if (field === "tax") {
      setTaxAmount(nextValue);
      if (fieldErrors.taxAmount) {
        setFieldErrors((prev) => ({ ...prev, taxAmount: false }));
      }
    }
    if (field === "total") {
      setTotalAmount(nextValue);
      if (fieldErrors.totalAmount) {
        setFieldErrors((prev) => ({ ...prev, totalAmount: false }));
      }
    }
    const inv = field === "invoice" ? parseFloat(nextValue) : parseFloat(invoiceAmount);
    const tax = field === "tax" ? parseFloat(nextValue) : parseFloat(taxAmount);
    if (field !== "total" && Number.isFinite(inv) && Number.isFinite(tax)) {
      setTotalAmount(String(Math.round((inv + tax) * 100) / 100));
      if (fieldErrors.totalAmount) {
        setFieldErrors((prev) => ({ ...prev, totalAmount: false }));
      }
    }
  };

  const submit = () => {
    setError(null);
    const errors: Record<string, boolean> = {};

    if (!vendorInvoiceNo.trim()) {
      errors.vendorInvoiceNo = true;
    }
    if (!vendorInvoiceDate) {
      errors.vendorInvoiceDate = true;
    }
    const invAmt = parseFloat(invoiceAmount);
    if (isNaN(invAmt) || invAmt < 0) {
      errors.invoiceAmount = true;
    }
    const taxAmt = parseFloat(taxAmount);
    if (isNaN(taxAmt) || taxAmt < 0) {
      errors.taxAmount = true;
    }
    const totAmt = parseFloat(totalAmount);
    if (isNaN(totAmt) || totAmt < 0) {
      errors.totalAmount = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fill all required fields correctly.");
      const firstErrorField = Object.keys(errors)[0];
      const el = document.getElementById(`inv-field-${firstErrorField}`);
      if (el) {
        el.focus();
      }
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
            <Input
              id="inv-field-vendorInvoiceNo"
              className={cn("h-8 text-xs", fieldErrors.vendorInvoiceNo && "border-red-500 focus-visible:ring-red-500")}
              value={vendorInvoiceNo}
              onChange={(e) => {
                setVendorInvoiceNo(e.target.value);
                if (fieldErrors.vendorInvoiceNo) {
                  setFieldErrors((prev) => ({ ...prev, vendorInvoiceNo: false }));
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Supplier Invoice Date *</Label>
            <Input
              id="inv-field-vendorInvoiceDate"
              type="date"
              className={cn("h-8 text-xs", fieldErrors.vendorInvoiceDate && "border-red-500 focus-visible:ring-red-500")}
              value={vendorInvoiceDate}
              onChange={(e) => {
                setVendorInvoiceDate(e.target.value);
                if (fieldErrors.vendorInvoiceDate) {
                  setFieldErrors((prev) => ({ ...prev, vendorInvoiceDate: false }));
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Invoice Amount *</Label>
            <Input
              id="inv-field-invoiceAmount"
              type="text"
              inputMode="decimal"
              className={cn("h-8 text-xs", fieldErrors.invoiceAmount && "border-red-500 focus-visible:ring-red-500")}
              value={invoiceAmount}
              onChange={(e) => onAmountChange("invoice", e.target.value)}
              onKeyDown={preventInvalidNumberKeys}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">GST Amount *</Label>
            <Input
              id="inv-field-taxAmount"
              type="text"
              inputMode="decimal"
              className={cn("h-8 text-xs", fieldErrors.taxAmount && "border-red-500 focus-visible:ring-red-500")}
              value={taxAmount}
              onChange={(e) => onAmountChange("tax", e.target.value)}
              onKeyDown={preventInvalidNumberKeys}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total Invoice Amount *</Label>
            <Input
              id="inv-field-totalAmount"
              type="text"
              inputMode="decimal"
              className={cn("h-8 text-xs", fieldErrors.totalAmount && "border-red-500 focus-visible:ring-red-500")}
              value={totalAmount}
              onChange={(e) => onAmountChange("total", e.target.value)}
              onKeyDown={preventInvalidNumberKeys}
            />
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
