"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, CheckCircle2, AlertTriangle, XCircle, ClipboardCheck, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { QcService } from "@/services/qc.service";
import { QcRecord } from "../../types";

const STATUS_CONFIG = {
  pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC", variant: "draft" as const },
  completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed", variant: "active" as const },
};

export default function ViewQcPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [qc, setQc] = useState<QcRecord | null>(null);

  useEffect(() => {
    QcService.get(params.id)
      .then((record) => {
        if (record) {
          setQc(record);
        }
      })
      .catch((err) => {
        console.error("Failed to load QC Record:", err);
      });
  }, [params.id]);

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
      <RecordDetailPage
        listHref="/warehouse/qc"
        listLabel="QC"
        recordName="QC Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">QC Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The QC record you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/qc")}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const statusCfg = STATUS_CONFIG[qc.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown", variant: "neutral" as const };
  const totalAccepted = qc.items.reduce((sum, it) => sum + it.acceptedQty, 0);
  const totalRejected = qc.items.reduce((sum, it) => sum + it.rejectedQty, 0);
  const totalReceived = qc.totalReceivedQty ?? qc.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalHold = qc.items.reduce((sum, it) => sum + (it.holdQty ?? 0), 0);
  const inspectionDateDisplay = qc.inspectionDate?.trim() ? qc.inspectionDate : "—";
  const canInspect = qc.status === "pending";

  return (
    <RecordDetailPage
      listHref="/warehouse/qc"
      listLabel="QC"
      recordName={qc.qcNo}
      recordCode={qc.grnNo}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: FileText, label: qc.poNumber ?? "—" },
        { icon: CheckCircle2, label: qc.vendorName },
        { icon: Building2, label: qc.warehouse },
        { icon: Calendar, label: inspectionDateDisplay },
      ]}
      secondaryAction={
        canInspect
          ? {
              label: "Perform QC",
              onClick: () => router.push(`/warehouse/qc/create?qcId=${qc.id}`),
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "GRN No.", value: qc.grnNo, highlight: true },
          { label: "Supplier", value: qc.vendorName },
          { label: "Warehouse", value: qc.warehouse },
          { label: "Total Received", value: totalReceived },
          { label: "Accepted Qty", value: totalAccepted },
          { label: "Rejected Qty", value: totalRejected },
          { label: "Hold Qty", value: totalHold },
          { label: "Products", value: qc.items.length },
        ],
        quickActions: canInspect
          ? [
              {
                label: "Perform QC",
                icon: ClipboardCheck,
                variant: "primary" as const,
                onClick: () => router.push(`/warehouse/qc/create?qcId=${qc.id}`),
              },
            ]
          : [],
      }}
    >
      <div className="w-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "GRN No.", val: qc.grnNo, icon: FileText },
            { label: "PO No.", val: qc.poNumber ?? "—", icon: FileText },
            { label: "Supplier", val: qc.vendorName, icon: CheckCircle2 },
            { label: "Warehouse", val: qc.warehouse, icon: Building2 },
            { label: "Inspection Date", val: inspectionDateDisplay, icon: Calendar },
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
                  <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">{card.val}</p>
                </div>
              </div>
            );
          })}
        </div>

        {qc.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
            <p className="text-xs font-semibold text-amber-800">Awaiting inspection</p>
            <p className="text-[11px] text-amber-700 mt-1">
              Start inspection to enter accepted, rejected, and hold quantities for this GRN.
            </p>
          </div>
        )}

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
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Qty Type</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-emerald-800 w-28">Accepted Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-red-800 w-28">Rejected Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-amber-800 w-28">Hold Qty</th>
                </tr>
              </thead>
              <tbody>
                {qc.items.map((it, idx) => {
                  const isCase = it.quantityType === "CASE";
                  const divisor = it.unitPerPacking || 10;
                  return (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="px-4 py-2 text-xs font-bold text-foreground">{it.productName}</td>
                      <td className="px-4 py-2 text-xs text-center tabular-nums">
                        {isCase ? `${Number((it.receivedQty / divisor).toFixed(4))} Cs` : `${it.receivedQty} Pcs`}
                      </td>
                      <td className="px-4 py-2 text-xs text-center font-semibold text-muted-foreground uppercase">
                        {it.quantityType || "PIECE"}
                      </td>
                      <td className="px-4 py-2 text-xs text-center tabular-nums text-emerald-700">
                        {isCase ? `${Number((it.acceptedQty / divisor).toFixed(4))} Cs` : `${it.acceptedQty} Pcs`}
                      </td>
                      <td className="px-4 py-2 text-xs text-center tabular-nums text-red-700">
                        {isCase ? `${Number((it.rejectedQty / divisor).toFixed(4))} Cs` : `${it.rejectedQty} Pcs`}
                      </td>
                      <td className="px-4 py-2 text-xs text-center tabular-nums text-amber-700">
                        {isCase ? `${Number(((it.holdQty ?? 0) / divisor).toFixed(4))} Cs` : `${it.holdQty ?? 0} Pcs`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {qc.status === "completed" && (
          <>
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Accepted Stocks Allocation
              </h2>
              {acceptedStock.length === 0 ? null : (
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

            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider border-b pb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Rejected Stocks Details
              </h2>
              {rejectedStock.length === 0 ? null : (
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
          </>
        )}
      </div>
    </RecordDetailPage>
  );
}
