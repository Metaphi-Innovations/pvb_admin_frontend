"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormContainer } from "@/components/layout/FormContainer";
import { Field, TextField } from "@/components/ui/FormFields";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { WAREHOUSE_OPTIONS } from "@/app/(app)/warehouse/dispatch/constants";
import { getSalesReturnRecords } from "@/app/(app)/sales/orders/sales-return-data";
import { saveGrnRecord, getGrnRecords } from "../shared/mock-data";
import { GrnRecord, GrnItem, GrnBatch } from "../shared/types";
import { onGrnCreated } from "@/lib/warehouse/inventory-movement";

interface LineInputState {
  sku: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  maxQty: number;
  receivedQty: number;
  caseSize: number;
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

export function SalesReturnCreate() {
  const router = useRouter();

  // Core Form State
  const [grnNo, setGrnNo] = useState("");
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Line Items State
  const [lines, setLines] = useState<LineInputState[]>([]);

  // 1. Auto-generate GRN number on load
  useEffect(() => {
    const existing = getGrnRecords();
    const count = existing.filter((g) => g.sourceType === "sales_return").length;
    setGrnNo(`GRN-SR-${String(count + 1).padStart(4, "0")}`);
  }, []);

  // 2. Fetch all pending sales returns (unfiltered by warehouse initially)
  const availableReturns = useMemo(() => {
    const allReturns = getSalesReturnRecords();
    const existingGrns = getGrnRecords();
    const processedNos = new Set(
      existingGrns
        .filter((g) => g.sourceType === "sales_return")
        .map((g) => g.salesReturnNo)
        .filter(Boolean)
    );

    return allReturns.filter((r) => !processedNos.has(r.returnNumber));
  }, []);

  // Selected Sales Return Record Details
  const activeReturn = useMemo(() => {
    return availableReturns.find((r) => r.id === selectedReturnId) || null;
  }, [selectedReturnId, availableReturns]);

  // Auto-set warehouse when return selection changes
  useEffect(() => {
    if (activeReturn) {
      setSelectedWarehouse(activeReturn.warehouse || "");
    } else {
      setSelectedWarehouse("");
    }
  }, [activeReturn]);

  // 3. Populate product items table when return selection changes
  useEffect(() => {
    if (!activeReturn) {
      setLines([]);
      return;
    }

    const initialLines: LineInputState[] = activeReturn.products.map((p) => {
      const today = new Date();
      const mfg = new Date(today);
      mfg.setMonth(mfg.getMonth() - 2);
      const exp = new Date(today);
      exp.setFullYear(exp.getFullYear() + 2);

      return {
        sku: p.sku,
        productName: p.product,
        batchNo: p.batchNo || "B-RET-UNKNOWN",
        mfgDate: mfg.toISOString().slice(0, 10),
        expDate: exp.toISOString().slice(0, 10),
        maxQty: p.returnQty,
        receivedQty: p.returnQty, // default to receiving the full return quantity
        caseSize: 10, // default case size
      };
    });

    setLines(initialLines);
  }, [activeReturn]);

  // Line editing handler helper
  const updateLineField = <K extends keyof LineInputState>(
    index: number,
    field: K,
    val: LineInputState[K]
  ) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val,
      };
      return copy;
    });
  };

  const handleSave = () => {
    if (!selectedWarehouse) {
      setError("Please select a sales return with a valid destination warehouse.");
      return;
    }
    if (!selectedReturnId || !activeReturn) {
      setError("Please select a sales return record to receive.");
      return;
    }

    // Validation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.receivedQty === 0) {
        setError(`Please enter received quantity for product "${line.productName}".`);
        return;
      }

      if (line.receivedQty > line.maxQty) {
        setError(
          `Received quantity (${line.receivedQty}) for "${line.productName}" exceeds the returned quantity (${line.maxQty}).`
        );
        return;
      }
    }

    setError(null);

    // Build items and batches for GrnRecord
    const grnItems: GrnItem[] = lines.map((line) => {
      return {
        productId: line.sku,
        productName: line.productName,
        productCode: line.sku,
        orderedQty: line.maxQty,
        receivedQty: line.receivedQty,
        balanceQty: line.maxQty - line.receivedQty,
        batchNumber: line.batchNo,
        mfgDate: line.mfgDate,
        expDate: line.expDate,
      };
    });

    const grnBatches: GrnBatch[] = lines.map((line) => {
      return {
        productId: line.sku,
        productName: line.productName,
        productCode: line.sku,
        batchNumber: line.batchNo,
        mfgDate: line.mfgDate,
        expDate: line.expDate,
        quantity: line.receivedQty,
      };
    });

    const totalQty = lines.reduce((s, l) => s + l.receivedQty, 0);

    const newGrn: GrnRecord = {
      id: `grn-sr-${Date.now()}`,
      grnNo,
      poNumber: "",
      vendorName: activeReturn.customer,
      warehouse: selectedWarehouse,
      grnDate: grnDate,
      totalProducts: lines.length,
      totalQty,
      status: "pending_qc",
      items: grnItems,
      batches: grnBatches,
      supplierInvoices: [],
      ocrExtractedInvoices: [],
      ocrExtractionCompleted: false,
      sourceType: "sales_return",
      salesReturnNo: activeReturn.returnNumber,
      customerName: activeReturn.customer,
      receiptStatus: "received",
      receiptRemarks: remarks,
    };

    saveGrnRecord(newGrn);
    onGrnCreated(newGrn);
    router.push("/warehouse/grn/sales-return");
  };

  return (
    <FormContainer
      title="Create Sales Return GRN"
      description="Record receipt of returned stock from sales returns. Batch details are auto-filled from purchase history."
      onBack={() => router.push("/warehouse/grn/sales-return")}
      onCancel={() => router.push("/warehouse/grn/sales-return")}
      actions={
        <Button
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={handleSave}
        >
          <Send className="w-3.5 h-3.5" /> Complete Receipt
        </Button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* 1. General Info Selector */}
        <SectionCard
          title="General Information"
          description="Select sales return record first. Destination warehouse will automatically populate and lock."
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <TextField
              label="GRN Number"
              value={grnNo}
              readOnly
              className="h-9 text-xs font-mono font-bold bg-muted/30"
            />
            
            <Field label="Select Sales Return" required>
              <AutocompleteSelect
                options={availableReturns.map((r) => ({
                  value: r.id,
                  label: r.returnNumber,
                  sublabel: `${r.customer} — ${r.products.length} item(s)`,
                }))}
                value={selectedReturnId}
                onChange={(val) => setSelectedReturnId(val as string)}
                placeholder="Select sales return…"
                searchPlaceholder="Search return order…"
                className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
              />
            </Field>

            <Field label="Warehouse Destination (Read-only)">
              <AutocompleteSelect
                options={WAREHOUSE_OPTIONS.filter((o) => o.value !== "All").map((w) => ({
                  value: w.value,
                  label: w.label,
                }))}
                value={selectedWarehouse}
                onChange={() => {}}
                placeholder="Auto-populated from Return…"
                disabled={true}
                className="h-9 text-xs py-1.5 px-3 rounded-lg border-border bg-muted/30 shadow-none focus:outline-none opacity-80"
              />
            </Field>

            <TextField
              label="GRN Date"
              type="date"
              value={grnDate}
              onChange={(e: any) => setGrnDate(e.target.value)}
              className="h-9 text-xs bg-white"
            />
          </div>
        </SectionCard>

        {activeReturn && lines.length > 0 && (
          <SectionCard
            title="Items to Receive"
            description="Select received quantities for returned items. Batch details and case sizes are read-only."
          >
            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[200px]">Product & SKU</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">Batch No.</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">MFG Date</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">Expiry Date</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">Case Size</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">Returned</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-28">Received Qty (Pcs)</th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-36">Case Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {lines.map((line, idx) => {
                      const cases = Math.floor(line.receivedQty / line.caseSize);
                      const loose = line.receivedQty % line.caseSize;
                      const breakdownText = cases > 0 
                        ? `${cases} Case${cases > 1 ? 's' : ''} + ${loose} Loose` 
                        : `${loose} Loose`;

                      return (
                        <tr key={idx} className="hover:bg-muted/10">
                          <td className="p-3">
                            <p className="text-xs font-semibold text-foreground">{line.productName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{line.sku}</p>
                          </td>
                          <td className="p-3">
                            <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                              {line.batchNo}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {line.mfgDate}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {line.expDate}
                          </td>
                          <td className="p-3 text-center text-xs font-medium text-muted-foreground tabular-nums">
                            {line.caseSize}
                          </td>
                          <td className="p-3 text-center text-xs font-medium tabular-nums">
                            {line.maxQty}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                value={line.receivedQty || ""}
                                onChange={(e) => updateLineField(idx, "receivedQty", Math.max(0, parseInt(e.target.value) || 0))}
                                className={cn(
                                  "h-8 text-center text-xs font-medium w-20 focus:ring-brand-500",
                                  line.receivedQty > line.maxQty && "border-red-500 text-red-600 focus:ring-red-500"
                                )}
                              />
                            </div>
                            {line.receivedQty > line.maxQty && (
                              <span className="block text-[8px] text-red-500 font-semibold text-center mt-1">Exceeds Return</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50/50 border border-brand-100/80 px-2.5 py-1 rounded-lg block text-center min-w-[100px] leading-tight">
                              {breakdownText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard title="Receipt Remarks" description="Add any relevant notes or details about the return receipt.">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Type any remarks here..."
            className="w-full min-h-[80px] p-3 text-xs border border-border rounded-lg bg-background focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
          />
        </SectionCard>
      </div>
    </FormContainer>
  );
}
