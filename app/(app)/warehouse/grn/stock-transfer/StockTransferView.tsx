"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Calendar, Building, AlertCircle, ClipboardCheck, FileText, CheckCircle2, Clock, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { getGrnById } from "../shared/mock-data";
import { GrnRecord } from "../shared/types";
import { getQcByGrnNo } from "@/app/(app)/warehouse/qc/mock-data";
import { BatchDetailsReadOnlyTable } from "../shared/components/BatchDetailsReadOnlyTable";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending_qc: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending QC", variant: "draft" as const },
  qc_in_progress: { bg: "bg-navy-50 text-navy-700 border-navy-200", label: "QC In Progress", variant: "neutral" as const },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed", variant: "active" as const },
};

function DocumentStatusRow({
  label,
  value,
  done,
}: {
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
          done
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-amber-50 text-amber-700 border-amber-200",
        )}
      >
        {done ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
        {value}
      </span>
    </div>
  );
}

export function StockTransferView({ id }: { id: string }) {
  const router = useRouter();
  const [grn, setGrn] = useState<GrnRecord | null>(null);

  useEffect(() => {
    const record = getGrnById(id);
    if (record) {
      setGrn(record);
    }
  }, [id]);

  if (!grn) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grn"
        listLabel="GRN"
        recordName="GRN Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">GRN Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The GRN ID you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/grn")}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const statusCfg = STATUS_CONFIG[grn.status] || {
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    label: "Unknown",
    variant: "neutral" as const,
  };
  const totalReceived = grn.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalOrdered = grn.items.reduce((sum, it) => sum + (it.orderedQty || 0), 0);
  const linkedQc = getQcByGrnNo(grn.grnNo);
  const canStartQc = grn.status === "pending_qc" && linkedQc?.status === "pending";
  const qcInspectHref = linkedQc
    ? `/warehouse/qc/create?qcId=${linkedQc.id}`
    : `/warehouse/qc/create?grnId=${grn.id}`;

  return (
    <RecordDetailPage
      listHref="/warehouse/grn"
      listLabel="GRN"
      recordName={grn.grnNo}
      recordCode={grn.stockTransferNo || "Stock Transfer"}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: Send, label: `From: ${grn.fromWarehouse || "—"}` },
        { icon: Building, label: `To: ${grn.toWarehouse || grn.warehouse || "—"}` },
        { icon: Calendar, label: grn.grnDate },
      ]}
      secondaryAction={
        canStartQc
          ? {
              label: "Perform QC Check",
              onClick: () => router.push(qcInspectHref),
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "Transfer No.", value: grn.stockTransferNo || "—", highlight: true },
          { label: "From Warehouse", value: grn.fromWarehouse || "—" },
          { label: "Destination", value: grn.toWarehouse || grn.warehouse || "—" },
          { label: "Dispatch Date", value: grn.dispatchDate || "—" },
          { label: "Items", value: grn.items.length },
          { label: "Total Dispatched", value: totalOrdered },
          { label: "Total Received", value: totalReceived },
          { label: "Batches", value: grn.batches.length },
        ],
        quickActions: canStartQc
          ? [
              {
                label: "Perform QC Check",
                icon: ClipboardCheck,
                variant: "primary" as const,
                onClick: () => router.push(qcInspectHref),
              },
            ]
          : [],
      }}
    >
      <div className="w-full space-y-6">
        {/* Document Status */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            Transfer Status
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Read-only tracking for stock transfer receipt and quality control verification.
          </p>
          <div className="rounded-lg border border-border bg-muted/10 px-3">
            <DocumentStatusRow
              label="Stock Transfer Dispatched"
              value="Dispatched"
              done={true}
            />
            <DocumentStatusRow
              label="Physical Receipt"
              value={grn.receiptStatus === "received" ? "Fully Received" : "Partially Received"}
              done={grn.receiptStatus === "received"}
            />
            <DocumentStatusRow
              label="QC Status"
              value={grn.status === "qc_completed" ? "QC Completed" : "Pending QC"}
              done={grn.status === "qc_completed"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Transfer No.", val: grn.stockTransferNo || "—", icon: Send },
            { label: "From Warehouse", val: grn.fromWarehouse || "—", icon: Building },
            { label: "Destination", val: grn.toWarehouse || grn.warehouse || "—", icon: Building },
            { label: "GRN Date", val: grn.grnDate, icon: Calendar },
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

        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">Items Received</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Product</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SKU</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Dispatched</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">Received</th>
                  <th className="p-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {grn.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-muted/10">
                    <td className="p-2 text-xs font-semibold text-foreground">{item.productName}</td>
                    <td className="p-2 text-xs font-mono text-muted-foreground">{item.productCode}</td>
                    <td className="p-2 text-xs text-right tabular-nums">{(item.orderedQty || 0).toLocaleString()}</td>
                    <td className="p-2 text-xs font-semibold text-right tabular-nums text-brand-600">{item.receivedQty.toLocaleString()}</td>
                    <td className="p-2 text-xs text-muted-foreground">{item.unit || "Unit"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {grn.batches.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">Batch Details</h3>
            <BatchDetailsReadOnlyTable batches={grn.batches} />
          </div>
        )}

        {grn.receiptRemarks && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-2">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">Receipt Remarks</h3>
            <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 border border-border/50">{grn.receiptRemarks}</p>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
