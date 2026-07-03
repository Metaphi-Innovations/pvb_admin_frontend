"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Calendar, Building, Landmark, Receipt, AlertCircle, ClipboardCheck, FileText, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { getGrnById } from "../shared/mock-data";
import { GrnRecord } from "../shared/types";
import { getQcByGrnNo } from "@/app/(app)/warehouse/qc/mock-data";
import { getGrnDocumentStatus } from "@/lib/warehouse/document-status";
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

export function PurchaseView({ id }: { id: string }) {
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
  const docStatus = getGrnDocumentStatus(grn);
  const totalReceived = grn.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalOrdered = grn.items.reduce((sum, it) => sum + it.orderedQty, 0);
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
      recordCode={grn.poNumber}
      statusLabel={statusCfg.label}
      statusVariant={statusCfg.variant}
      metaItems={[
        { icon: Landmark, label: grn.vendorName },
        { icon: Building, label: grn.warehouse },
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
          { label: "PO Number", value: grn.poNumber, highlight: true },
          { label: "Supplier", value: grn.vendorName },
          { label: "Delivery Challan", value: grn.deliveryChallan ?? "—" },
          { label: "Items", value: grn.items.length },
          { label: "Total Ordered", value: totalOrdered },
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
        {/* Document Status — read-only visibility */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            Document Status
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Read-only tracking for warehouse operations. Procurement matching is handled separately.
          </p>
          <div className="rounded-lg border border-border bg-muted/10 px-3">
            <DocumentStatusRow
              label="Purchase Order"
              value={docStatus.purchaseOrder.label}
              done={docStatus.purchaseOrder.value === "linked"}
            />
            <DocumentStatusRow
              label="Delivery Challan"
              value={docStatus.deliveryChallan.label}
              done={docStatus.deliveryChallan.value === "uploaded"}
            />
            <DocumentStatusRow
              label="Supplier Invoice"
              value={docStatus.supplierInvoice.label}
              done={docStatus.supplierInvoice.value === "uploaded"}
            />
            <DocumentStatusRow
              label="OCR Extraction"
              value={docStatus.ocrExtraction.label}
              done={docStatus.ocrExtraction.value === "completed"}
            />
            <DocumentStatusRow
              label="QC Status"
              value={docStatus.qcStatus.label}
              done={docStatus.qcStatus.value === "completed"}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "PO Number", val: grn.poNumber, icon: Receipt },
            { label: "Supplier", val: grn.vendorName, icon: Landmark },
            { label: "Warehouse", val: grn.warehouse, icon: Building },
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
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Order Items Summary
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">SKU</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Ordered</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Prev. Received</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Pending</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Current Received</th>
                </tr>
              </thead>
              <tbody>
                {grn.items.map((it) => (
                  <tr key={`${it.productId}-${it.poNumber}`} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-bold text-foreground">{it.productName}</td>
                    <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{it.productCode}</td>
                    <td className="px-4 py-2 text-xs text-center font-medium text-muted-foreground">{it.orderedQty}</td>
                    <td className="px-4 py-2 text-xs text-center text-muted-foreground">{it.alreadyReceivedQty ?? 0}</td>
                    <td className="px-4 py-2 text-xs text-center font-medium text-amber-700">{it.pendingQty ?? 0}</td>
                    <td className="px-4 py-2 text-xs text-center font-bold text-brand-700 bg-brand-50/20">{it.receivedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {grn.batches.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Batch Details
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Read-only — batch and invoice line details extracted from supplier invoice via OCR.
            </p>
            <BatchDetailsReadOnlyTable
              batches={grn.batches}
              invoiceMeta={
                grn.ocrExtractedInvoices?.[0]
                  ? {
                      invoiceNumber: grn.ocrExtractedInvoices[0].invoiceNumber,
                      supplierName: grn.ocrExtractedInvoices[0].supplierName,
                      invoiceDate: grn.ocrExtractedInvoices[0].invoiceDate,
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
