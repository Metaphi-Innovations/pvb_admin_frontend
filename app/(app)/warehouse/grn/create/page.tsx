"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Upload, AlertCircle, X, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  MOCK_POS,
  saveGrnRecord,
  getGrnRecords,
  getAlreadyReceivedQty,
  getEligiblePosForVendor,
  mockExtractInvoiceDataFromFiles,
  buildGrnBatchesFromOcr,
  getEffectiveReceiptQty,
} from "../mock-data";
import { GrnItem, GrnBatch, GrnRecord, GrnOcrExtractedInvoice, GrnSupplierInvoice } from "../types";
import { onGrnCreated } from "@/lib/warehouse/inventory-movement";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Field, TextField } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";
import { BatchDetailsReadOnlyTable } from "../components/BatchDetailsReadOnlyTable";

interface UploadedInvoice {
  id: string;
  name: string;
}

function itemKey(productId: string, poNumber: string) {
  return `${productId}::${poNumber}`;
}

function validateBatchRow(b: GrnBatch): string | null {
  if (!b.productId || !b.productName) return "Product is required";
  if (!b.batchNumber.trim()) return "Batch No. is required";
  if (!b.mfgDate.trim()) return "MFG Date is required";
  if (!b.expDate.trim()) return "Expiry Date is required";
  if (b.quantity <= 0) return "Quantity must be greater than 0";
  if (b.mfgDate && b.expDate && b.expDate < b.mfgDate) {
    return "Expiry Date cannot be before MFG Date";
  }
  return null;
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
  const [ocrExtractedInvoices, setOcrExtractedInvoices] = useState<GrnOcrExtractedInvoice[]>([]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemWarnings, setItemWarnings] = useState<Record<string, string>>({});
  const [batchProductWarnings, setBatchProductWarnings] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
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
    return "";
  }, []);

  const getItemQtyWarning = useCallback((it: GrnItem, qty: number): string => {
    const pending = it.pendingQty ?? it.orderedQty - (it.alreadyReceivedQty ?? 0);
    if (qty > pending) {
      return `Current received (${qty}) exceeds pending qty (${pending}). Over-receipt allowed — approval handled separately.`;
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

  const runOcrExtract = (
    files: UploadedInvoice[],
    currentItems: GrnItem[],
    supplier: string,
    options?: { prefillReceived?: boolean },
  ) => {
    if (files.length === 0) {
      return;
    }

    let itemsForOcr = currentItems;
    const needsReceivedPrefill =
      options?.prefillReceived && !currentItems.some((it) => it.receivedQty > 0);

    if (needsReceivedPrefill) {
      itemsForOcr = currentItems.map((it) => ({
        ...it,
        receivedQty: it.pendingQty ?? Math.max(0, it.orderedQty - (it.alreadyReceivedQty ?? 0)),
      }));
      setItems(itemsForOcr);
    }

    if (!itemsForOcr.some((it) => getEffectiveReceiptQty(it) > 0)) {
      return;
    }

    const ocrInvoices = mockExtractInvoiceDataFromFiles(files, itemsForOcr, supplier);
    const extractedBatches = buildGrnBatchesFromOcr(ocrInvoices, itemsForOcr);

    setOcrExtractedInvoices(ocrInvoices);
    setBatches(extractedBatches);
    recomputeBatchProductWarnings(itemsForOcr, extractedBatches);
  };

  const handleVendorChange = (selectedVendor: string) => {
    setVendor(selectedVendor);
    setSelectedPoNos([]);
    setItems([]);
    setBatches([]);
    setUploadedInvoices([]);
    setItemErrors({});
    setBatchProductWarnings({});
    setItemWarnings({});
    setOcrExtractedInvoices([]);
    setFormError(null);
  };

  const handlePoChange = (poNums: string[]) => {
    setSelectedPoNos(poNums);
    const listItems = buildItemsFromPos(poNums);
    setItems(listItems);
    setBatches([]);
    setItemErrors({});
    setBatchProductWarnings({});
    setItemWarnings({});
    setOcrExtractedInvoices([]);
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
      const warning = target ? getItemQtyWarning(target, qty) : "";
      setItemErrors((e) => {
        const copy = { ...e };
        if (error) copy[key] = error;
        else delete copy[key];
        return copy;
      });
      setItemWarnings((w) => {
        const copy = { ...w };
        if (warning) copy[key] = warning;
        else delete copy[key];
        return copy;
      });
      recomputeBatchProductWarnings(next, batches);
      if (uploadedInvoices.length > 0) {
        runOcrExtract(uploadedInvoices, next, vendor);
      }
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
    if (items.length > 0) {
      runOcrExtract(next, items, vendor, { prefillReceived: true });
    }
    e.target.value = "";
  };

  const removeUploadedInvoice = (id: string) => {
    const next = uploadedInvoices.filter((f) => f.id !== id);
    setUploadedInvoices(next);
    if (next.length > 0 && items.length > 0) {
      runOcrExtract(next, items, vendor);
    } else {
      setOcrExtractedInvoices([]);
      setBatches([]);
      setBatchProductWarnings({});
    }
  };

  const handleSubmit = () => {
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

    if (uploadedInvoices.length === 0) {
      setFormError("Upload at least one supplier invoice to extract batch details.");
      return;
    }

    if (batches.length === 0) {
      setFormError("Batch details not available. Upload a supplier invoice to extract batch data.");
      return;
    }

    const invalidBatch = batches.find((b) => validateBatchRow(b));
    if (invalidBatch) {
      setFormError("OCR batch data is incomplete. Re-upload the supplier invoice.");
      return;
    }

    const supplierInvoices: GrnSupplierInvoice[] = uploadedInvoices.map((f) => ({
      id: f.id,
      fileName: f.name,
      uploadedAt: new Date().toISOString(),
    }));

    const newRecord: GrnRecord = {
      id: `grn-${Date.now()}`,
      grnNo,
      poNumber: selectedPoNos.join(", "),
      vendorName: vendor,
      warehouse,
      grnDate,
      totalProducts: receivedItems.length,
      totalQty: items.reduce((sum, it) => sum + it.receivedQty, 0),
      status: "pending_qc",
      items,
      batches: batches.map((b) => ({ ...b, quantity: Number(b.quantity) || 0 })),
      supplierInvoices,
      ocrExtractedInvoices,
      ocrExtractionCompleted: ocrExtractedInvoices.length > 0,
      invoiceFileNames: uploadedInvoices.map((f) => f.name),
      invoiceFileName: uploadedInvoices[0]?.name,
    };

    saveGrnRecord(newRecord);
    onGrnCreated(newRecord);
    alert("GRN saved — stock moved to Pending QC.");
    router.push("/warehouse/grn");
  };

  return (
    <FormContainer
      title="Generate GRN"
      description="Capture physical goods receipt, batch details, and supplier invoice OCR data. No procurement matching is performed here."
      onBack={() => router.push("/warehouse/grn")}
      onCancel={() => router.push("/warehouse/grn")}
      actions={
        <>
          <Button
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
            onClick={handleSubmit}
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
        description="Pending Qty = Ordered Qty − Previously Received Qty. Over-receipt shows a warning but does not block save."
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
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Prev. Received</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Pending</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[128px] min-w-[128px]">
                      Current Received
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const key = itemKey(it.productId, it.poNumber || "");
                    const err = itemErrors[key];
                    const warn = itemWarnings[key];
                    return (
                      <tr key={`${key}-${idx}`} className="border-b border-border/50">
                        <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700 align-middle">{it.poNumber}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-foreground align-middle">{it.productName}</td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground align-middle">{it.productCode || "—"}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium align-middle tabular-nums">{it.orderedQty}</td>
                        <td className="px-3 py-2 text-xs text-center text-muted-foreground align-middle tabular-nums">{it.alreadyReceivedQty ?? 0}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium text-amber-700 align-middle tabular-nums">{it.pendingQty ?? 0}</td>
                        <td className="px-3 py-2 align-middle w-[128px] min-w-[128px]">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              min={0}
                              value={it.receivedQty === 0 ? "" : it.receivedQty}
                              placeholder="0"
                              onChange={(e) => handleItemQtyChange(it.productId, it.poNumber || "", e.target.value)}
                              className={cn(
                                "h-9 w-full text-xs text-center tabular-nums font-semibold rounded-lg",
                                "bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
                                !err && !warn && "border-border text-brand-700",
                                err && "border-red-400 focus-visible:ring-red-300 text-foreground",
                                warn && !err && "border-amber-400 focus-visible:ring-amber-300 text-foreground",
                              )}
                            />
                            {err && (
                              <p className="text-[10px] text-red-500 leading-tight flex items-start gap-0.5">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{err}</span>
                              </p>
                            )}
                            {warn && !err && (
                              <p className="text-[10px] text-amber-700 leading-tight flex items-start gap-0.5">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{warn}</span>
                              </p>
                            )}
                          </div>
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
        description="Upload supplier invoice files — OCR populates read-only Batch Details and invoice data below."
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

      </SectionCard>

      {batches.length > 0 && (
        <SectionCard
          title="Batch Details"
          description="Read-only — batch and invoice line details extracted via OCR. Not editable in Warehouse."
        >
          {Object.keys(batchProductWarnings).length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
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
          <BatchDetailsReadOnlyTable
            batches={batches}
            invoiceMeta={
              ocrExtractedInvoices[0]
                ? {
                    invoiceNumber: ocrExtractedInvoices[0].invoiceNumber,
                    supplierName: ocrExtractedInvoices[0].supplierName,
                    invoiceDate: ocrExtractedInvoices[0].invoiceDate,
                  }
                : undefined
            }
          />
        </SectionCard>
      )}
    </FormContainer>
  );
}
