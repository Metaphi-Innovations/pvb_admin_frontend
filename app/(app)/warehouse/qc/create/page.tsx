"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { QcService } from "@/services/qc.service";
import { QcItem, QcRecord, QcResult } from "../types";
import { cn } from "@/lib/utils";
import { TextField, FormSection } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";
import { onQcCompleted } from "@/lib/warehouse/inventory-movement";
import { completeStockTransferQc } from "@/app/(app)/sales/stock-transfer/warehouse-receipt-sync";
import { getQcSourceType } from "@/lib/warehouse/grn-source";
import { showToast } from "@/lib/toast";

function deriveQcResult(items: QcItem[]): QcResult {
  const totalAccepted = items.reduce((s, it) => s + it.acceptedQty, 0);
  const totalRejected = items.reduce((s, it) => s + it.rejectedQty, 0);
  const totalHold = items.reduce((s, it) => s + (it.holdQty ?? 0), 0);
  if (totalHold > 0 && totalAccepted === 0 && totalRejected === 0) return "hold";
  if (totalRejected === 0 && totalHold === 0) return "passed";
  if (totalAccepted === 0) return "failed";
  return "partial";
}

function parseQtyInput(raw: string, max?: number): number {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return 0;
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return 0;
  const clamped = Math.max(0, n);
  return max != null ? Math.min(clamped, max) : clamped;
}

function qtyInputValue(qty: number): string {
  return qty === 0 ? "" : String(qty);
}

function CreateQcForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qcIdParam = searchParams.get("qcId") || "";
  const grnIdParam = searchParams.get("grnId") || "";

  const [qcRecordId, setQcRecordId] = useState("");
  const [qcNo, setQcNo] = useState("");
  const [grnRecordId, setGrnRecordId] = useState("");
  const [grnNo, setGrnNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [vendor, setVendor] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [stockTransferNo, setStockTransferNo] = useState("");
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [isStockTransfer, setIsStockTransfer] = useState(false);
  const [sourceType, setSourceType] = useState<QcRecord["sourceType"]>("purchase_order");
  const [qcRemarks, setQcRemarks] = useState("");
  const [items, setItems] = useState<QcItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecord = async () => {
      try {
        let qc: QcRecord | undefined;
        if (qcIdParam) {
          qc = await QcService.get(qcIdParam);
        } else if (grnIdParam) {
          qc = await QcService.getGrn(grnIdParam);
        }

        if (!qc) {
          setLoadError("QC record not found. Open inspection from the QC listing.");
          return;
        }

        const editParam = searchParams.get("edit") === "true";
        if (qc.status === "completed" && !editParam) {
          router.replace(`/warehouse/qc/view/${qc.id}`);
          return;
        }

        const stMode = getQcSourceType(qc) === "stock_transfer";

        setQcRecordId(qc.id);
        
        let displayQcNo = qc.qcNo;
        if (!displayQcNo || displayQcNo === "—") {
          try {
            const preview = await QcService.getPreviewNumber();
            displayQcNo = preview.qcNumber;
          } catch (err) {
            console.error("Failed to fetch preview QC number:", err);
          }
        }
        setQcNo(displayQcNo || "—");
        setGrnRecordId(qc.grnId ?? "");
        setGrnNo(qc.grnNo);
        setPoNumber(qc.poNumber ?? "");
        setVendor(qc.vendorName);
        setWarehouse(qc.warehouse);
        setStockTransferNo(qc.stockTransferNo ?? qc.poNumber ?? "");
        setFromWarehouse(qc.fromWarehouse ?? qc.vendorName);
        setToWarehouse(qc.toWarehouse ?? qc.warehouse);
        setIsStockTransfer(stMode);
        setSourceType(stMode ? "stock_transfer" : "purchase_order");
        setQcRemarks(qc.qcRemarks ?? "");
        
        setItems(qc.items.map((it) => {
          if (editParam) {
            const unitPerPacking = it.unitPerPacking || 10;
            const acceptedQty = it.acceptedQty || 0;
            const rejectedQty = it.rejectedQty || 0;
            const holdQty = it.holdQty || 0;
            return {
              ...it,
              acceptedQty,
              acceptedCases: it.acceptedCases ?? Math.floor(acceptedQty / unitPerPacking),
              acceptedLooseQty: it.acceptedLooseQty ?? (acceptedQty % unitPerPacking),
              rejectedQty,
              rejectedCases: it.rejectedCases ?? Math.floor(rejectedQty / unitPerPacking),
              rejectedLooseQty: it.rejectedLooseQty ?? (rejectedQty % unitPerPacking),
              holdQty,
              holdCases: it.holdCases ?? Math.floor(holdQty / unitPerPacking),
              holdLooseQty: it.holdLooseQty ?? (holdQty % unitPerPacking),
            };
          }
          return { ...it, holdQty: 0, rejectedQty: 0, acceptedQty: 0 };
        }));
      } catch (err) {
        console.error("Failed to load QC or GRN details:", err);
        setLoadError("QC record not found. Open inspection from the QC listing.");
      }
    };

    loadRecord();
  }, [qcIdParam, grnIdParam, router, searchParams]);

  const handleQtyChange = (
    idx: number,
    field: "accepted" | "rejected" | "hold",
    type: "cases" | "loose",
    raw: string
  ) => {
    const val = parseQtyInput(raw);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        
        const unitPerPacking = item.unitPerPacking || 10;
        
        const newCases = type === "cases" ? val : (item[`${field}Cases`] || 0);
        const newLoose = type === "loose" ? val : (item[`${field}LooseQty`] || 0);
        const total = newCases * unitPerPacking + newLoose;

        const updated = {
          ...item,
          [`${field}Cases`]: newCases,
          [`${field}LooseQty`]: newLoose,
          [`${field}Qty`]: total,
        };

        // If not stock transfer, auto-calculate rejected if accepted changes
        if (!isStockTransfer && field === "accepted") {
          const received = item.receivedQty ?? 0;
          updated.rejectedQty = Math.max(0, received - total);
          updated.rejectedCases = Math.floor(updated.rejectedQty / unitPerPacking);
          updated.rejectedLooseQty = updated.rejectedQty % unitPerPacking;
          updated.holdQty = 0;
        }

        return updated;
      })
    );
  };

  const handleReasonChange = (idx: number, val: string) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, rejectionReason: val } : item)));
  };

  const validationErrors = useMemo(() => {
    return items
      .map((item) => {
        const hold = item.holdQty ?? 0;
        const sum = item.acceptedQty + item.rejectedQty + hold;
        if (sum !== item.receivedQty) {
          if (isStockTransfer) {
            return `Batch ${item.batchNumber} (${item.productName}): Accepted (${item.acceptedQty}) + Rejected (${item.rejectedQty}) + Hold (${hold}) = ${sum}, but received qty is ${item.receivedQty}.`;
          }
          return `Batch ${item.batchNumber} (${item.productName}): Accepted (${item.acceptedQty}) + Rejected (${item.rejectedQty}) = ${sum}, but GRN Received Qty is ${item.receivedQty}.`;
        }
        if (sum > item.receivedQty) {
          return `Batch ${item.batchNumber}: total allocated qty exceeds received qty.`;
        }
        return null;
      })
      .filter(Boolean);
  }, [items, isStockTransfer]);

  const hasErrors = validationErrors.length > 0;
  const hasEmptyRows = items.some((it) => {
    const hold = it.holdQty ?? 0;
    if (isStockTransfer) return it.acceptedQty === 0 && it.rejectedQty === 0 && hold === 0;
    return it.acceptedQty === 0 && it.rejectedQty === 0;
  });
  const hasStartedEntry = items.some(
    (it) => it.acceptedQty > 0 || it.rejectedQty > 0 || (it.holdQty ?? 0) > 0,
  );

  const handleSubmit = async () => {
    if (!grnNo || !qcRecordId) {
      showToast("Missing QC / GRN reference.", "error");
      return;
    }
    if (hasErrors || hasEmptyRows) {
      showToast(
        isStockTransfer
          ? "Enter accepted, rejected, or hold qty for each batch. Sum must equal received qty."
          : "Enter accepted qty for each batch. Accepted + Rejected must equal received qty.",
        "error"
      );
      return;
    }

    try {
      const backendSourceType = 
        sourceType === "purchase_order" ? "PURCHASE_ORDER" :
        sourceType === "sales_return" ? "SALES_RETURN" :
        sourceType === "stock_transfer" ? "STOCK_TRANSFER" :
        sourceType === "sample_return" ? "SAMPLE_RETURN" :
        "PURCHASE_ORDER";

      const payload = {
        grnId: grnRecordId,
        qcDate: new Date().toISOString(),
        remarks: qcRemarks.trim(),
        source_type: backendSourceType,
        items: items.map((it) => ({
          grnBatchId: it.grnBatchId,
          receivedQty: it.receivedQty,
          acceptedQty: it.acceptedQty,
          rejectedQty: it.rejectedQty,
          case_size: it.unitPerPacking || 10,
          remarks: it.rejectionReason || "",
        })),
      };

      const editParam = searchParams.get("edit") === "true";
      if (editParam) {
        await QcService.update(qcRecordId, payload);
        showToast("QC Record updated successfully.", "success");
      } else {
        await QcService.create(payload);
        showToast(
          isStockTransfer
            ? "QC completed — accepted qty added to destination warehouse inventory (Stock Transfer In)."
            : "QC completed — stock moved to Available / Rejected.",
          "success"
        );
      }
      router.push("/warehouse/qc");
    } catch (err: any) {
      console.error("Failed to submit QC Record:", err);
      showToast(err.response?.data?.message || "Failed to submit QC Record.", "error");
    }
  };

  if (loadError) {
    return (
      <FormContainer title="QC Inspection" description="Unable to load QC record." onBack={() => router.push("/warehouse/qc")}>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">{loadError}</div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={isStockTransfer ? "Stock Transfer QC Inspection" : "QC Inspection"}
      description={
        isStockTransfer
          ? "Enter accepted, rejected, and hold qty per batch. Only accepted qty is added to destination inventory after QC pass."
          : "Enter accepted qty — rejected qty auto-fills as the balance. You can edit rejected if needed."
      }
      onBack={() => router.push("/warehouse/qc")}
      onCancel={() => router.push("/warehouse/qc")}
      actions={
        <Button
          disabled={hasErrors || hasEmptyRows || items.length === 0}
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={handleSubmit}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Complete QC
        </Button>
      }
    >
      {hasStartedEntry && hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide">Quantity Allocation Mismatch</h3>
            <ul className="list-disc list-inside text-xs mt-1 space-y-1">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="font-medium">{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <FormSection title="Inspection Header">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <TextField label="QC No." value={qcNo} readOnly className="h-8 text-xs font-mono font-bold bg-muted/30" />
          <TextField label="GRN No." value={grnNo} readOnly className="h-8 text-xs font-mono font-semibold bg-muted/30" />
          {isStockTransfer ? (
            <>
              <TextField label="Stock Transfer No." value={stockTransferNo} readOnly className="h-8 text-xs font-mono font-semibold bg-muted/30" />
              <TextField label="From Warehouse" value={fromWarehouse} readOnly className="h-8 text-xs bg-muted/30 font-medium" />
              <TextField label="To Warehouse" value={toWarehouse} readOnly className="h-8 text-xs bg-muted/30 font-medium" />
            </>
          ) : (
            <>
              <TextField label="PO No." value={poNumber} readOnly className="h-8 text-xs font-mono font-semibold bg-muted/30" />
              <TextField label="Supplier" value={vendor} readOnly className="h-8 text-xs bg-muted/30 font-medium" />
              <TextField label="Warehouse" value={warehouse} readOnly className="h-8 text-xs bg-muted/30 font-medium" />
            </>
          )}
          <TextField label="Inspection Date" value="Set on completion" readOnly className="h-8 text-xs bg-muted/30 text-muted-foreground" />
        </div>

        <TextField
          label="QC Remarks"
          value={qcRemarks}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQcRemarks(e.target.value)}
          placeholder="Inspection notes, hold reason, or rejection details…"
          className="h-8 text-xs"
          fieldClassName="md:col-span-4 lg:col-span-6"
        />
      </FormSection>

      <hr className="border-border" />

      <FormSection
        title={
          isStockTransfer
            ? "Batch Inspection — Accepted + Rejected + Hold = Received Qty"
            : "Batch Inspection — Accepted + Rejected = Received Qty"
        }
      >
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Referenced GRN contains no batch rows.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-36">Batch No.</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-32">Received</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-emerald-800 w-36">Accepted</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-red-800 w-36">Rejected</th>
                  {isStockTransfer && (
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-amber-800 w-36">Hold</th>
                  )}
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const hold = item.holdQty ?? 0;
                  const sum = item.acceptedQty + item.rejectedQty + (isStockTransfer ? hold : 0);
                  const isRowValid = sum === item.receivedQty;

                  return (
                    <tr key={idx} className={cn("border-b border-border/50 transition-colors", !isRowValid && "bg-red-50/20")}>
                      <td className="px-4 py-2 text-xs font-bold text-foreground">
                        {item.productName}
                        <span className="block text-[10px] font-mono text-muted-foreground">{item.productCode}</span>
                      </td>
                      <td className="px-4 py-2 text-xs font-mono font-medium text-muted-foreground">{item.batchNumber}</td>
                      <td className="px-4 py-2 text-xs text-center font-medium text-muted-foreground">
                        <div className="font-semibold text-foreground">
                          {item.receivedCases ?? Math.floor(item.receivedQty / (item.unitPerPacking || 10))} Cs / {item.receivedLooseQty ?? (item.receivedQty % (item.unitPerPacking || 10))} Ls
                        </div>
                        <div className="text-[10px] text-muted-foreground/80">Total: {item.receivedQty}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex gap-1 mb-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Cs"
                            value={qtyInputValue(item.acceptedCases ?? 0)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(idx, "accepted", "cases", e.target.value)}
                            className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                            title="Cases"
                          />
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ls"
                            value={qtyInputValue(item.acceptedLooseQty ?? 0)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(idx, "accepted", "loose", e.target.value)}
                            className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                            title="Loose Qty"
                          />
                        </div>
                        <div className="text-center text-[10px] text-muted-foreground">Total: {item.acceptedQty}</div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex gap-1 mb-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Cs"
                            value={qtyInputValue(item.rejectedCases ?? 0)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(idx, "rejected", "cases", e.target.value)}
                            className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                            title="Cases"
                          />
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Ls"
                            value={qtyInputValue(item.rejectedLooseQty ?? 0)}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleQtyChange(idx, "rejected", "loose", e.target.value)}
                            className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                            title="Loose Qty"
                          />
                        </div>
                        <div className="text-center text-[10px] text-muted-foreground">Total: {item.rejectedQty}</div>
                      </td>
                      {isStockTransfer && (
                        <td className="px-4 py-2 text-xs">
                          <div className="flex gap-1 mb-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Cs"
                              value={qtyInputValue(item.holdCases ?? 0)}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleQtyChange(idx, "hold", "cases", e.target.value)}
                              className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                              title="Cases"
                            />
                            <Input
                              type="text"
                              inputMode="numeric"
                              placeholder="Ls"
                              value={qtyInputValue(item.holdLooseQty ?? 0)}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleQtyChange(idx, "hold", "loose", e.target.value)}
                              className={cn("h-8 text-xs text-center w-full", !isRowValid && "border-red-300")}
                              title="Loose Qty"
                            />
                          </div>
                          <div className="text-center text-[10px] text-muted-foreground">Total: {hold}</div>
                        </td>
                      )}
                      <td className="px-4 py-2 text-xs">
                        <Input
                          placeholder="Remarks…"
                          value={item.rejectionReason ?? ""}
                          onChange={(e) => handleReasonChange(idx, e.target.value)}
                          className="h-8 text-xs w-full"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FormSection>
    </FormContainer>
  );
}

export default function CreateQcPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading...</div>}>
      <CreateQcForm />
    </Suspense>
  );
}
