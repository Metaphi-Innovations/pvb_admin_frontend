"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormContainer } from "@/components/layout/FormContainer";
import { Field, TextField } from "@/components/ui/FormFields";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { getTransferById, hydrateTransferLineItems } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { getStockTransferDispatchLines, createStockTransferGrn } from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import { getGrnRecords } from "../shared/mock-data";

interface LineInputState {
  productId: string;
  productName: string;
  productCode: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  dispatchedQty: number;
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

export function StockTransferCreate({ dispatchId }: { dispatchId: number }) {
  const router = useRouter();

  const transfer = useMemo(() => {
    const t = getTransferById(dispatchId);
    return t ? hydrateTransferLineItems(t) : null;
  }, [dispatchId]);

  const dispatchLines = useMemo(() => {
    return transfer ? getStockTransferDispatchLines(transfer) : [];
  }, [transfer]);

  // Form State
  const [grnNo, setGrnNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Line items received quantities
  const [lines, setLines] = useState<LineInputState[]>([]);

  // 1. Precompute GRN Number
  useEffect(() => {
    if (!transfer) return;
    const grnList = getGrnRecords();
    const generated = `ST-GRN-${transfer.transferNumber.replace("ST-", "")}-${grnList.length + 1}`;
    setGrnNo(generated);
  }, [transfer]);

  // 2. Prepopulate items to receive
  useEffect(() => {
    if (!dispatchLines.length) return;
    setLines(
      dispatchLines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productCode: line.productCode,
        batchNumber: line.batchNumber,
        mfgDate: line.mfgDate || new Date().toISOString().slice(0, 10),
        expDate: line.expDate || new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        dispatchedQty: line.dispatchedQty,
        receivedQty: line.dispatchedQty, // default to receive full quantity
        caseSize: 10, // default case size
      }))
    );
  }, [dispatchLines]);

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
    if (!transfer) {
      setError("Source stock transfer not found.");
      return;
    }

    // Validation
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.receivedQty === 0) {
        setError(`Please enter received quantity for product "${line.productName}".`);
        return;
      }
      if (line.receivedQty > line.dispatchedQty) {
        setError(
          `Received quantity (${line.receivedQty}) for "${line.productName}" exceeds the dispatched quantity (${line.dispatchedQty}).`
        );
        return;
      }
    }

    setError(null);

    const result = createStockTransferGrn(
      transfer,
      lines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        productCode: line.productCode,
        batchNumber: line.batchNumber,
        mfgDate: line.mfgDate,
        expDate: line.expDate,
        dispatchedQty: line.dispatchedQty,
        receivedQty: line.receivedQty,
      })),
      remarks
    );

    if ("error" in result) {
      setError(result.error);
      return;
    }

    router.push("/warehouse/grn/stock-transfer");
  };

  if (!transfer) {
    return (
      <FormContainer
        title="Create Stock Transfer GRN"
        description="Transfer not found or not eligible for receipt."
        onBack={() => router.push("/warehouse/grn/stock-transfer")}
      >
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>This stock transfer is not available. It may already be received or is not in transit.</span>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Create Stock Transfer GRN"
      description="Record receipt of transferred stock between warehouses. Details are populated from dispatch records."
      onBack={() => router.push("/warehouse/grn/stock-transfer")}
      onCancel={() => router.push("/warehouse/grn/stock-transfer")}
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

        {/* 1. Header General Information */}
        <SectionCard
          title="General Information"
          description="Inward details automatically fetched from transit dispatch record."
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <TextField
              label="GRN Number"
              value={grnNo}
              readOnly
              className="h-9 text-xs font-mono font-bold bg-muted/30"
            />

            <Field label="Stock Transfer Number">
              <AutocompleteSelect
                options={[{ value: transfer.transferNumber, label: transfer.transferNumber }]}
                value={transfer.transferNumber}
                onChange={() => {}}
                disabled={true}
                className="h-9 text-xs py-1.5 px-3 rounded-lg border-border bg-muted/30 shadow-none focus:outline-none opacity-80"
              />
            </Field>

            <Field label="Destination Warehouse">
              <AutocompleteSelect
                options={[{ value: transfer.targetWarehouseName, label: transfer.targetWarehouseName }]}
                value={transfer.targetWarehouseName}
                onChange={() => {}}
                disabled={true}
                className="h-9 text-xs py-1.5 px-3 rounded-lg border-border bg-muted/30 shadow-none focus:outline-none opacity-80"
              />
            </Field>

            <TextField
              label="GRN Date"
              value={new Date().toISOString().slice(0, 10)}
              readOnly
              className="h-9 text-xs font-bold bg-muted/30"
            />
          </div>
        </SectionCard>

        {lines.length > 0 && (
          <SectionCard
            title="Items to Receive"
            description="Input received quantities in pieces. Batch details and case sizes are read-only."
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
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">Dispatched</th>
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
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{line.productCode}</p>
                          </td>
                          <td className="p-3">
                            <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                              {line.batchNumber}
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
                            {line.dispatchedQty}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                value={line.receivedQty || ""}
                                onChange={(e) => updateLineField(idx, "receivedQty", Math.max(0, parseInt(e.target.value) || 0))}
                                className={cn(
                                  "h-8 text-center text-xs font-medium w-20 focus:ring-brand-500",
                                  line.receivedQty > line.dispatchedQty && "border-red-500 text-red-600 focus:ring-red-500"
                                )}
                              />
                            </div>
                            {line.receivedQty > line.dispatchedQty && (
                              <span className="block text-[8px] text-red-500 font-semibold text-center mt-1">Exceeds Shipped</span>
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

        <SectionCard title="Receipt Remarks" description="Add any relevant notes or details about the stock transfer receipt.">
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
