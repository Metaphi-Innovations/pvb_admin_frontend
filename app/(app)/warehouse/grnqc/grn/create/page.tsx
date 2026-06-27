"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Send, Upload, ScanLine, AlertCircle, X, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MOCK_POS,
  saveGrnRecord,
  getGrnRecords,
  getAlreadyReceivedQty,
  getEligiblePosForVendor,
  mockExtractInvoiceBatchesFromFiles,
} from "../mock-data";
import { GrnItem, GrnBatch, GrnRecord, GrnStatus } from "../types";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Field, TextField } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";

interface UploadedInvoice {
  id: string;
  name: string;
}

function itemKey(productId: string, poNumber: string) {
  return `${productId}::${poNumber}`;
}

function isValidDateString(value: string): boolean {
  if (!value.trim()) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

function getBatchProductWarnings(items: GrnItem[], batches: GrnBatch[]): Record<string, string> {
  const warnings: Record<string, string> = {};
  for (const it of items) {
    if (it.receivedQty <= 0) continue;
    const key = itemKey(it.productId, it.poNumber || "");
    const batchSum = batches
      .filter((b) => b.productId === it.productId && b.poNumber === it.poNumber)
      .reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
    if (batchSum !== it.receivedQty) {
      warnings[key] =
        "Batch quantity does not match received quantity for this product. You can still save the GRN.";
    }
  }
  return warnings;
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/5 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function GenerateGrnPage() {
  const router = useRouter();

  const [grnNo, setGrnNo] = useState("");
  const [vendor, setVendor] = useState("");
  const [selectedPoNos, setSelectedPoNos] = useState<string[]>([]);
  const [warehouse, setWarehouse] = useState("Central Warehouse");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);

  const [items, setItems] = useState<GrnItem[]>([]);
  const [batches, setBatches] = useState<GrnBatch[]>([]);
  const [uploadedInvoices, setUploadedInvoices] = useState<UploadedInvoice[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [batchErrors, setBatchErrors] = useState<Record<number, string>>({});
  const [batchProductWarnings, setBatchProductWarnings] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);

  useEffect(() => {
    const existing = getGrnRecords();
    const nextNum = existing.length + 1;
    setGrnNo(`GRN-2024-${nextNum.toString().padStart(3, "0")}`);
  }, []);

  const vendors = useMemo(() => {
    const unique = new Set(MOCK_POS.map((po) => po.vendorName));
    return Array.from(unique);
  }, []);

  const availablePos = useMemo(() => {
    if (!vendor) return [];
    return getEligiblePosForVendor(vendor);
  }, [vendor]);

  const validateItemQty = useCallback((it: GrnItem, qty: number): string => {
    if (qty < 0) return "Quantity cannot be negative";
    const pending = it.pendingQty ?? it.orderedQty - (it.alreadyReceivedQty ?? 0);
    if (qty > pending) {
      return `Cannot exceed pending quantity (${pending})`;
    }
    if (qty + (it.alreadyReceivedQty ?? 0) > it.orderedQty) {
      return "Total received cannot exceed ordered quantity";
    }
    return "";
  }, []);

  const recomputeBatchProductWarnings = useCallback(
    (nextItems: GrnItem[], nextBatches: GrnBatch[]) => {
      setBatchProductWarnings(getBatchProductWarnings(nextItems, nextBatches));
    },
    [],
  );

  const buildItemsFromPos = (poNums: string[]): GrnItem[] => {
    const pos = MOCK_POS.filter((p) => poNums.includes(p.poNumber));
    const listItems: GrnItem[] = [];
    pos.forEach((po) => {
      po.items.forEach((it) => {
        const alreadyReceivedQty = getAlreadyReceivedQty(po.poNumber, it.productId);
        const pendingQty = Math.max(0, it.orderedQty - alreadyReceivedQty);
        if (pendingQty <= 0) return;
        listItems.push({
          productId: it.productId,
          productName: it.productName,
          productCode: it.productCode,
          orderedQty: it.orderedQty,
          alreadyReceivedQty,
          pendingQty,
          receivedQty: 0,
          unit: "Unit",
          poNumber: po.poNumber,
        });
      });
    });
    return listItems;
  };

  const runOcrExtract = (files: UploadedInvoice[], currentItems: GrnItem[]) => {
    if (files.length === 0) {
      setOcrMessage("Upload at least one invoice file to extract batch details.");
      return;
    }
    if (!currentItems.some((it) => it.receivedQty > 0)) {
      setOcrMessage("Enter received quantities in Order Items Summary first.");
      return;
    }
    const extracted = mockExtractInvoiceBatchesFromFiles(files, currentItems);
    setBatches(extracted);
    recomputeBatchProductWarnings(currentItems, extracted);
    setBatchErrors({});
    setOcrMessage(`Extracted ${extracted.length} batch row(s) from ${files.length} invoice file(s).`);
  };

  const handleVendorChange = (selectedVendor: string) => {
    setVendor(selectedVendor);
    setSelectedPoNos([]);
    setItems([]);
    setBatches([]);
    setUploadedInvoices([]);
    setItemErrors({});
    setBatchErrors({});
    setBatchProductWarnings({});
    setFormError(null);
    setOcrMessage(null);
  };

  const handlePoChange = (poNums: string[]) => {
    setSelectedPoNos(poNums);
    const listItems = buildItemsFromPos(poNums);
    setItems(listItems);
    setBatches([]);
    setItemErrors({});
    setBatchErrors({});
    setBatchProductWarnings({});
    setFormError(null);
  };

  const handleItemQtyChange = (productId: string, poNumber: string, val: string) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    const key = itemKey(productId, poNumber);

    setItems((prev) => {
      const next = prev.map((it) =>
        it.productId === productId && it.poNumber === poNumber ? { ...it, receivedQty: qty } : it,
      );
      const target = next.find((it) => it.productId === productId && it.poNumber === poNumber);
      const error = target ? validateItemQty(target, qty) : "";
      setItemErrors((e) => {
        const copy = { ...e };
        if (error) copy[key] = error;
        else delete copy[key];
        return copy;
      });
      recomputeBatchProductWarnings(next, batches);
      return next;
    });
  };

  const handleInvoiceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList?.length) return;

    const added: UploadedInvoice[] = Array.from(fileList).map((file) => ({
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: file.name,
    }));

    const next = [...uploadedInvoices, ...added];
    setUploadedInvoices(next);
    setOcrMessage(null);
    if (items.some((it) => it.receivedQty > 0)) {
      runOcrExtract(next, items);
    }
    e.target.value = "";
  };

  const removeUploadedInvoice = (id: string) => {
    const next = uploadedInvoices.filter((f) => f.id !== id);
    setUploadedInvoices(next);
    if (next.length > 0 && items.some((it) => it.receivedQty > 0)) {
      runOcrExtract(next, items);
    } else {
      setOcrMessage(null);
    }
  };

  const addBatchRow = () => {
    if (items.length === 0) return;
    const firstActive = items.find((it) => it.receivedQty > 0) ?? items[0];
    setBatches((prev) => [
      ...prev,
      {
        productId: firstActive.productId,
        productName: firstActive.productName,
        invoiceNumber: "",
        invoiceDate: "",
        batchNumber: "",
        mfgDate: "",
        expDate: "",
        quantity: 0,
        poNumber: firstActive.poNumber,
        gstRate: undefined,
        invoiceRate: undefined,
      },
    ]);
  };

  const removeBatchRow = (idx: number) => {
    setBatchErrors((prev) => {
      const next: Record<number, string> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const i = Number(k);
        if (i < idx) next[i] = v;
        else if (i > idx) next[i - 1] = v;
      });
      return next;
    });
    setBatches((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      recomputeBatchProductWarnings(items, next);
      return next;
    });
  };

  const validateBatchRowHard = (b: GrnBatch): string | null => {
    if (!b.productId || !b.productName) return "Product is required";
    const inSummary = items.some(
      (it) => it.productId === b.productId && it.poNumber === b.poNumber,
    );
    if (!inSummary) return "Product must exist in Order Items Summary";
    if (!b.batchNumber.trim()) return "Batch No. is required";
    if (b.quantity <= 0) return "Quantity must be greater than 0";
    if (b.invoiceDate && !isValidDateString(b.invoiceDate)) return "Invalid invoice date format";
    if (b.mfgDate && b.expDate && b.expDate < b.mfgDate) {
      return "Expiry Date cannot be before MFD Date";
    }
    return null;
  };

  const handleBatchUpdate = (idx: number, field: keyof GrnBatch, val: string | number) => {
    setBatches((prev) => {
      const next = prev.map((b, i) => {
        if (i !== idx) return b;

        if (field === "productId") {
          const [prodId, poNum] = String(val).split("::");
          const prod = items.find((it) => it.productId === prodId && it.poNumber === poNum);
          return {
            ...b,
            productId: prodId,
            productName: prod ? prod.productName : "",
            poNumber: poNum,
          };
        }

        if ((field === "gstRate" || field === "invoiceRate") && val === "") {
          return { ...b, [field]: undefined };
        }

        return { ...b, [field]: val };
      });

      const rowErr = validateBatchRowHard(next[idx]);
      setBatchErrors((e) => {
        const copy = { ...e };
        if (rowErr) copy[idx] = rowErr;
        else delete copy[idx];
        return copy;
      });
      recomputeBatchProductWarnings(items, next);
      return next;
    });
  };

  const handleSubmit = (status: GrnStatus) => {
    setFormError(null);

    if (!vendor) {
      setFormError("Please select a vendor.");
      return;
    }
    if (selectedPoNos.length === 0) {
      setFormError("Please select at least one Purchase Order.");
      return;
    }

    const receivedItems = items.filter((it) => it.receivedQty > 0);
    if (receivedItems.length === 0) {
      setFormError("Enter at least one current received quantity greater than 0.");
      return;
    }

    const qtyErrors: Record<string, string> = {};
    for (const it of receivedItems) {
      const err = validateItemQty(it, it.receivedQty);
      if (err) qtyErrors[itemKey(it.productId, it.poNumber || "")] = err;
    }
    if (Object.keys(qtyErrors).length > 0) {
      setItemErrors((prev) => ({ ...prev, ...qtyErrors }));
      setFormError("Fix invalid quantities in Order Items Summary before saving.");
      return;
    }

    if (batches.length > 0) {
      const rowErrs: Record<number, string> = {};
      batches.forEach((b, idx) => {
        const err = validateBatchRowHard(b);
        if (err) rowErrs[idx] = err;
      });
      if (Object.keys(rowErrs).length > 0) {
        setBatchErrors(rowErrs);
        setFormError("Fix batch detail errors before saving.");
        return;
      }
    }

    const invoiceNumbers = [...new Set(batches.map((b) => b.invoiceNumber).filter(Boolean))];
    const invoiceDates = [...new Set(batches.map((b) => b.invoiceDate).filter(Boolean))];

    const newRecord: GrnRecord = {
      id: `grn-${Date.now()}`,
      grnNo,
      poNumber: selectedPoNos.join(", "),
      vendorName: vendor,
      warehouse,
      grnDate,
      totalProducts: receivedItems.length,
      totalQty: items.reduce((sum, it) => sum + it.receivedQty, 0),
      status,
      items,
      batches: batches.map((b) => ({ ...b, quantity: Number(b.quantity) || 0 })),
      invoiceNumber: invoiceNumbers.join(", ") || undefined,
      invoiceDate: invoiceDates.join(", ") || undefined,
      invoiceFileNames: uploadedInvoices.map((f) => f.name),
      invoiceFileName: uploadedInvoices[0]?.name,
    };

    saveGrnRecord(newRecord);
    alert(status === "draft" ? "GRN Draft Saved!" : "GRN Submitted to Quality Check!");
    router.push("/warehouse/grnqc");
  };

  const batchProductOptions = items
    .filter((it) => it.receivedQty > 0)
    .map((it) => ({
      value: `${it.productId}::${it.poNumber}`,
      label: `${it.productName} (${it.poNumber})`,
    }));

  return (
    <FormContainer
      title="Generate GRN"
      description="Register inward stock against approved purchase orders and assign invoice batch details."
      onBack={() => router.push("/warehouse/grnqc")}
      onCancel={() => router.push("/warehouse/grnqc")}
      actions={
        <>
          <Button
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
            onClick={() => handleSubmit("qc_pending")}
          >
            <Send className="w-3.5 h-3.5" /> Submit GRN
          </Button>
        </>
      }
    >
      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {formError}
        </div>
      )}

      {/* 1. Supplier & PO Selection */}
      <SectionCard
        title="Supplier & PO Selection"
        description="Select supplier first, then choose one or more approved purchase orders with pending quantities."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TextField
            label="GRN Number"
            value={grnNo}
            readOnly
            className="h-9 text-xs font-mono font-bold bg-muted/30"
          />

          <Field label="Supplier" required>
            <AutocompleteSelect
              options={vendors.map((v) => ({ value: v, label: v }))}
              value={vendor}
              onChange={handleVendorChange}
              placeholder="Select supplier…"
              searchPlaceholder="Search vendor…"
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field
            label="Select Purchase Orders"
            required
            hint={vendor && availablePos.length === 0 ? "No approved POs with pending qty for this supplier." : undefined}
          >
            <AutocompleteSelect
              options={availablePos.map((po) => ({
                value: po.poNumber,
                label: po.poNumber,
                sublabel: `${po.items.length} item(s) pending receipt`,
              }))}
              value={selectedPoNos}
              onChange={handlePoChange}
              placeholder="Select PO(s)…"
              searchPlaceholder="Search PO…"
              multiple
              disabled={!vendor}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field label="Warehouse Destination" required>
            <AutocompleteSelect
              options={[
                { value: "Central Warehouse", label: "Central Warehouse" },
                { value: "North Zone Hub", label: "North Zone Hub" },
                { value: "South Zone Depot", label: "South Zone Depot" },
                { value: "West Zone Hub", label: "West Zone Hub" },
              ]}
              value={warehouse}
              onChange={setWarehouse}
              placeholder="Select warehouse…"
              searchPlaceholder="Search warehouse…"
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <TextField
            label="GRN Date"
            type="date"
            value={grnDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrnDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </SectionCard>

      {/* 2. Order Items Summary */}
      <SectionCard
        title="Order Items Summary"
        description="Review PO line items and enter current received quantities."
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a supplier and at least one purchase order to view order items.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">PO No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">SKU / Code</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Ordered</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Received</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Pending</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">Current Received</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const key = itemKey(it.productId, it.poNumber || "");
                    const err = itemErrors[key];
                    return (
                      <tr key={`${key}-${idx}`} className="border-b border-border/50 align-top">
                        <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700">{it.poNumber}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-foreground">{it.productName}</td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{it.productCode || "—"}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium">{it.orderedQty}</td>
                        <td className="px-3 py-2 text-xs text-center text-muted-foreground">{it.alreadyReceivedQty ?? 0}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium text-amber-700">{it.pendingQty ?? 0}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            max={it.pendingQty}
                            value={it.receivedQty || ""}
                            placeholder="0"
                            onChange={(e) => handleItemQtyChange(it.productId, it.poNumber || "", e.target.value)}
                            className={cn(
                              "h-9 text-xs text-center w-24 mx-auto",
                              err && "border-red-400 focus-visible:ring-red-300",
                            )}
                          />
                          {err && (
                            <p className="text-[10px] text-red-500 mt-1 text-center flex items-center justify-center gap-0.5">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {err}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      {/* 3. Upload Invoice(s) */}
      <SectionCard
        title="Upload Invoice(s)"
        description="Upload one or more supplier invoice files. Batch details are auto-extracted when received quantities are entered."
      >
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-lg bg-white cursor-pointer hover:bg-muted/30 transition-colors text-xs font-medium text-foreground">
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Add invoice file(s)
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              multiple
              className="hidden"
              onChange={handleInvoiceFilesChange}
            />
          </label>
          {uploadedInvoices.length > 0 && items.some((it) => it.receivedQty > 0) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runOcrExtract(uploadedInvoices, items)}
              className="h-9 text-xs gap-1.5 rounded-lg"
            >
              <ScanLine className="w-3.5 h-3.5" /> Auto Extract
            </Button>
          )}
        </div>

        {uploadedInvoices.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No invoice files uploaded yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {uploadedInvoices.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-white px-3 py-2"
              >
                <span className="text-xs truncate text-foreground">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeUploadedInvoice(file.id)}
                  className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {ocrMessage && (
          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {ocrMessage}
          </p>
        )}
      </SectionCard>

      {/* 4. Invoice Batch Details */}
      <SectionCard
        title="Invoice Batch Details"
        description="Enter invoice and batch-wise receipt details. One product may have multiple rows across invoices."
        action={
          items.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBatchRow}
              className="h-7 text-xs gap-1 rounded-lg flex-shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> Add Batch Row
            </Button>
          ) : undefined
        }
      >
        {Object.keys(batchProductWarnings).length > 0 && (
          <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            {Object.entries(batchProductWarnings).map(([key, msg]) => {
              const [prodId, poNum] = key.split("::");
              const prod = items.find((it) => it.productId === prodId && it.poNumber === poNum);
              return (
                <p key={key} className="text-[11px] text-amber-800 flex items-start gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>
                    <span className="font-medium">{prod?.productName}:</span> {msg}
                  </span>
                </p>
              );
            })}
          </div>
        )}

        {batches.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Upload invoice(s) or add batch rows manually after entering received quantities.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">Invoice Number</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">Invoice Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[140px]">Product Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">Batch No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">MFD Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">Expiry Date</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">Qty</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">GST %</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Rate</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b, idx) => {
                    const rowErr = batchErrors[idx];
                    return (
                      <tr key={idx} className="border-b border-border/50 align-top">
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Invoice No."
                            value={b.invoiceNumber ?? ""}
                            onChange={(e) => handleBatchUpdate(idx, "invoiceNumber", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={b.invoiceDate ?? ""}
                            onChange={(e) => handleBatchUpdate(idx, "invoiceDate", e.target.value)}
                            className={cn(
                              "h-9 text-xs",
                              rowErr?.includes("invoice date") && "border-red-400",
                            )}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <AutocompleteSelect
                            options={
                              batchProductOptions.length > 0
                                ? batchProductOptions
                                : items.map((it) => ({
                                    value: `${it.productId}::${it.poNumber}`,
                                    label: `${it.productName} (${it.poNumber})`,
                                  }))
                            }
                            value={`${b.productId}::${b.poNumber}`}
                            onChange={(val) => handleBatchUpdate(idx, "productId", val)}
                            placeholder="Select product…"
                            searchPlaceholder="Search…"
                            className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            placeholder="Batch No. *"
                            value={b.batchNumber}
                            onChange={(e) => handleBatchUpdate(idx, "batchNumber", e.target.value)}
                            className={cn("h-9 text-xs", rowErr?.includes("Batch") && "border-red-400")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={b.mfgDate}
                            onChange={(e) => handleBatchUpdate(idx, "mfgDate", e.target.value)}
                            className="h-9 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={b.expDate}
                            onChange={(e) => handleBatchUpdate(idx, "expDate", e.target.value)}
                            className={cn(
                              "h-9 text-xs",
                              (rowErr?.includes("Expiry") || rowErr?.includes("before")) && "border-red-400",
                            )}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            value={b.quantity || ""}
                            onChange={(e) => handleBatchUpdate(idx, "quantity", Number(e.target.value) || 0)}
                            className={cn("h-9 text-xs text-center", rowErr?.includes("Quantity") && "border-red-400")}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="—"
                            value={b.gstRate ?? ""}
                            onChange={(e) =>
                              handleBatchUpdate(
                                idx,
                                "gstRate",
                                e.target.value === "" ? "" : Number(e.target.value),
                              )
                            }
                            className="h-9 text-xs text-center"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="—"
                            value={b.invoiceRate ?? ""}
                            onChange={(e) =>
                              handleBatchUpdate(
                                idx,
                                "invoiceRate",
                                e.target.value === "" ? "" : Number(e.target.value),
                              )
                            }
                            className="h-9 text-xs text-center"
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBatchRow(idx)}
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {Object.entries(batchErrors).map(([idx, msg]) => (
              <p
                key={idx}
                className="text-[10px] text-red-500 px-3 py-1.5 border-t border-border/50 flex items-center gap-1"
              >
                <AlertCircle className="w-3 h-3" /> Row {Number(idx) + 1}: {msg}
              </p>
            ))}
          </div>
        )}
      </SectionCard>
    </FormContainer>
  );
}
