"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getQcById } from "../../mock-data";
import { QcRecord } from "../../types";

const STATUS_CONFIG = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export default function ViewQcPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [qc, setQc] = useState<QcRecord | null>(null);

  useEffect(() => {
    const record = getQcById(params.id);
    if (record) {
      setQc(record);
    }
  }, [params.id]);

  // Separate stock splits
  const acceptedStock = useMemo(() => {
    if (!qc) return [];
    return qc.items.filter((it) => it.acceptedQty > 0);
  }, [qc]);

  const rejectedStock = useMemo(() => {
    if (!qc) return [];
    return qc.items.filter((it) => it.rejectedQty > 0);
  }, [qc]);

  if (!qc) {
    return (
      <FormContainer title="QC Details" onBack={() => router.push("/warehouse/grnqc")}>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">QC Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The QC record you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/grnqc")}>
            Go Back
          </Button>
        </div>
      </FormContainer>
    );
  }

  const statusCfg = STATUS_CONFIG[qc.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown" };

  return (
    <FormContainer
      title={qc.qcNo}
      description="QC Inspection Summary"
      onBack={() => router.push("/warehouse/grnqc")}
      actions={
        <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
          {statusCfg.label}
        </span>
      }
      noCard={true}
    >
      <div className="w-full space-y-6">
        {/* Section 1: Header Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "GRN No.", val: qc.grnNo, icon: FileText },
            { label: "PO No.", val: qc.poNumber ?? "—", icon: FileText },
            { label: "Vendor", val: qc.vendorName, icon: CheckCircle2 },
            { label: "Inspection Date", val: qc.inspectionDate, icon: Calendar },
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider leading-none">
                    {card.label}
                  </p>
                  <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">
                    {card.val}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {qc.qcRemarks && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">QC Remarks</h2>
            <p className="text-xs text-foreground">{qc.qcRemarks}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Product QC Summary
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Received Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-emerald-800 w-28">Accepted Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-red-800 w-28">Rejected Qty</th>
                </tr>
              </thead>
              <tbody>
                {qc.items.map((it, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-bold text-foreground">{it.productName}</td>
                    <td className="px-4 py-2 text-xs text-center tabular-nums">{it.receivedQty}</td>
                    <td className="px-4 py-2 text-xs text-center tabular-nums text-emerald-700">{it.acceptedQty}</td>
                    <td className="px-4 py-2 text-xs text-center tabular-nums text-red-700">{it.rejectedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Accepted Stock Grid */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Accepted Stocks Allocation
          </h2>
          {acceptedStock.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No stocks accepted in this inspection.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-emerald-50/20 border-b border-border">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-emerald-800">Product</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-emerald-800 w-44">Batch/Lot No</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-emerald-800 w-36">Accepted Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedStock.map((it, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="px-4 py-2 text-xs font-bold text-foreground">{it.productName}</td>
                      <td className="px-4 py-2 text-xs font-mono font-medium text-muted-foreground">{it.batchNumber}</td>
                      <td className="px-4 py-2 text-xs text-center font-bold text-emerald-700 bg-emerald-50/10">{it.acceptedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Rejected Stock Grid */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            Rejected Stocks Details
          </h2>
          {rejectedStock.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No stocks rejected in this inspection.</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-red-50/10 border-b border-border">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-red-800">Product</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-red-800 w-44">Batch/Lot No</th>
                    <th className="px-4 py-2 text-center text-[11px] font-semibold text-red-800 w-36">Rejected Qty</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-red-800">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedStock.map((it, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="px-4 py-2 text-xs font-bold text-foreground">{it.productName}</td>
                      <td className="px-4 py-2 text-xs font-mono font-medium text-muted-foreground">{it.batchNumber}</td>
                      <td className="px-4 py-2 text-xs text-center font-bold text-red-700 bg-red-50/10">{it.rejectedQty}</td>
                      <td className="px-4 py-2 text-xs text-red-800 italic font-medium">{it.rejectionReason || "No reason specified"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </FormContainer>
  );
}
