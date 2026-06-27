"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getGrnById, saveGrnRecord } from "../../grn/mock-data";
import { saveQcRecord, getQcRecords } from "../mock-data";
import { QcItem, QcRecord, QcStatus } from "../types";
import { cn } from "@/lib/utils";
import { TextField, FormSection } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";

function CreateQcForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grnId = searchParams.get("grnId") || "";

  // Dynamic state
  const [qcNo, setQcNo] = useState("");
  const [grnNo, setGrnNo] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [vendor, setVendor] = useState("");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [qcRemarks, setQcRemarks] = useState("");
  const [items, setItems] = useState<QcItem[]>([]);

  // Find GRN and populate
  useEffect(() => {
    const grn = getGrnById(grnId);
    if (grn) {
      setGrnNo(grn.grnNo);
      setPoNumber(grn.poNumber);
      setVendor(grn.vendorName);
      
      // Map batches to QC items
      setItems(
        grn.batches.map((b) => ({
          productId: b.productId,
          productName: b.productName,
          batchNumber: b.batchNumber,
          receivedQty: b.quantity,
          acceptedQty: b.quantity, // default all accepted
          rejectedQty: 0,
          rejectionReason: "",
        }))
      );
    }
    
    // Generate QC No
    const existingQcs = getQcRecords();
    const nextNum = existingQcs.length + 1;
    setQcNo(`QC-2024-${nextNum.toString().padStart(3, "0")}`);
  }, [grnId]);

  // Update Accepted / Rejected quantities
  const handleQtyChange = (idx: number, field: "acceptedQty" | "rejectedQty", val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        
        const updated = { ...item, [field]: num };
        
        // Auto-balance: if received is 100, accepted changes to 80, set rejected to 20
        if (field === "acceptedQty") {
          updated.rejectedQty = Math.max(0, item.receivedQty - num);
        } else {
          updated.acceptedQty = Math.max(0, item.receivedQty - num);
        }
        
        return updated;
      })
    );
  };

  const handleReasonChange = (idx: number, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, rejectionReason: val } : item))
    );
  };

  // Validation validation check
  const validationErrors = useMemo(() => {
    return items.map((item) => {
      const sum = item.acceptedQty + item.rejectedQty;
      const isValid = sum === item.receivedQty;
      
      if (!isValid) {
        return `Batch ${item.batchNumber} (${item.productName}) has mismatch: Accepted (${item.acceptedQty}) + Rejected (${item.rejectedQty}) = ${sum}, but Received Qty is ${item.receivedQty}.`;
      }
      return null;
    }).filter(Boolean);
  }, [items]);

  const hasErrors = validationErrors.length > 0;

  const handleSubmit = (status: QcStatus) => {
    if (!grnNo) {
      alert("Missing GRN reference.");
      return;
    }
    if (hasErrors) {
      alert("Please fix allocation sum mismatches before submitting.");
      return;
    }

    const newQc: QcRecord = {
      id: `qc-${Date.now()}`,
      qcNo,
      grnNo,
      poNumber,
      vendorName: vendor,
      inspectionDate,
      totalAcceptedQty: items.reduce((sum, it) => sum + it.acceptedQty, 0),
      totalRejectedQty: items.reduce((sum, it) => sum + it.rejectedQty, 0),
      status,
      qcRemarks: qcRemarks.trim(),
      items,
    };

    saveQcRecord(newQc);

    // If submitted / completed, update corresponding GRN status to qc_completed!
    if (status === "completed") {
      const grn = getGrnById(grnId);
      if (grn) {
        grn.status = "grn-3" === grn.id ? "qc_completed" : "qc_completed"; // set to completed
        saveGrnRecord({ ...grn, status: "qc_completed" });
      }
    }

    alert(status === "completed" ? "Quality Control check completed!" : "Inspection draft saved!");
    router.push("/warehouse/grnqc");
  };

  return (
    <FormContainer
      title="QC Inspection"
      description="Perform quality control inspection on incoming batches."
      onBack={() => router.push("/warehouse/grnqc")}
      onCancel={() => router.push("/warehouse/grnqc")}
      actions={
        <>
          <Button
            disabled={hasErrors}
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
            onClick={() => handleSubmit("completed")}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Submit QC
          </Button>
        </>
      }
    >
      {/* Validation Errors Box */}
      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-red-800">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide">Validation Mismatches Found</h3>
            <ul className="list-disc list-inside text-xs mt-1 space-y-1">
              {validationErrors.map((err, idx) => (
                <li key={idx} className="font-medium">{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Header fields */}
      <FormSection title="Inspection Header Section">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <TextField
            label="QC Inspection No"
            value={qcNo}
            readOnly
            className="h-8 text-xs font-mono font-bold bg-muted/30"
          />

          <TextField
            label="GRN No."
            value={grnNo}
            readOnly
            className="h-8 text-xs font-mono font-semibold bg-muted/30"
          />

          <TextField
            label="PO No."
            value={poNumber}
            readOnly
            className="h-8 text-xs font-mono font-semibold bg-muted/30"
          />

          <TextField
            label="Supplier Name"
            value={vendor}
            readOnly
            className="h-8 text-xs bg-muted/30 font-medium"
          />

          <TextField
            label="Inspection Date"
            type="date"
            value={inspectionDate}
            onChange={(e: any) => setInspectionDate(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        
        <TextField
          label="QC Remarks"
          value={qcRemarks}
          onChange={(e: any) => setQcRemarks(e.target.value)}
          placeholder="Inspection notes for 3-Way Match and debit note reference…"
          className="h-8 text-xs"
          fieldClassName="md:col-span-4 lg:col-span-5"
        />
      </FormSection>

      <hr className="border-border" />

      {/* Product Inspection Grid */}
      <FormSection title="Product Inspection Allocation">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Referenced GRN contains no active batch rows.
        </p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product Details</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">Batch/Lot No</th>
                <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Received Qty</th>
                <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Accepted Qty</th>
                <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Rejected Qty</th>
                <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Rejection Reason</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const sum = item.acceptedQty + item.rejectedQty;
                const isRowValid = sum === item.receivedQty;
                
                return (
                  <tr
                    key={idx}
                    className={cn(
                      "border-b border-border/50 transition-colors",
                      !isRowValid && "bg-red-50/20"
                    )}
                  >
                    <td className="px-4 py-2 text-xs font-bold text-foreground">
                      {item.productName}
                    </td>
                    <td className="px-4 py-2 text-xs font-mono font-medium text-muted-foreground">
                      {item.batchNumber}
                    </td>
                    <td className="px-4 py-2 text-xs text-center font-semibold text-muted-foreground">
                      {item.receivedQty}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <Input
                        type="number"
                        value={item.acceptedQty}
                        onChange={(e) => handleQtyChange(idx, "acceptedQty", e.target.value)}
                        className={cn(
                          "h-8 text-xs text-center w-20 mx-auto",
                          !isRowValid && "border-red-300 focus:ring-red-400"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <Input
                        type="number"
                        value={item.rejectedQty}
                        onChange={(e) => handleQtyChange(idx, "rejectedQty", e.target.value)}
                        className={cn(
                          "h-8 text-xs text-center w-20 mx-auto",
                          !isRowValid && "border-red-300 focus:ring-red-400"
                        )}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <Input
                        placeholder="Reason for rejection..."
                        value={item.rejectionReason}
                        onChange={(e) => handleReasonChange(idx, e.target.value)}
                        className="h-8 text-xs w-full"
                        disabled={item.rejectedQty <= 0}
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
