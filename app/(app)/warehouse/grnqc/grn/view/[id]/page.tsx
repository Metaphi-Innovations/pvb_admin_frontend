"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Calendar, Building, Landmark, Receipt, AlertCircle, ClipboardCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { getGrnById } from "../../mock-data";
import { GrnRecord } from "../../types";

const STATUS_CONFIG = {
  draft: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Draft", variant: "draft" as const },
  submitted: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Submitted", variant: "neutral" as const },
  qc_pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "QC Pending", variant: "draft" as const },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed", variant: "active" as const },
};

export default function ViewGrnPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [grn, setGrn] = useState<GrnRecord | null>(null);

  useEffect(() => {
    const record = getGrnById(params.id);
    if (record) {
      setGrn(record);
    }
  }, [params.id]);

  if (!grn) {
    return (
      <RecordDetailPage
        listHref="/warehouse/grnqc"
        listLabel="GRN & QC"
        recordName="GRN Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">GRN Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The GRN ID you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/grnqc")}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const statusCfg = STATUS_CONFIG[grn.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown", variant: "neutral" as const };
  const totalReceived = grn.items.reduce((sum, it) => sum + it.receivedQty, 0);
  const totalOrdered = grn.items.reduce((sum, it) => sum + it.orderedQty, 0);

  return (
    <RecordDetailPage
      listHref="/warehouse/grnqc"
      listLabel="GRN & QC"
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
        grn.status === "qc_pending"
          ? {
              label: "Perform QC Check",
              onClick: () => router.push(`/warehouse/grnqc/qc/create?grnId=${grn.id}`),
            }
          : undefined
      }
      sidebar={{
        summary: [
          { label: "PO Number", value: grn.poNumber, highlight: true },
          { label: "Supplier", value: grn.vendorName },
          { label: "Items", value: grn.items.length },
          { label: "Total Ordered", value: totalOrdered },
          { label: "Total Received", value: totalReceived },
          { label: "Batches", value: grn.batches.length },
        ],
        quickActions:
          grn.status === "qc_pending"
            ? [
                {
                  label: "Perform QC Check",
                  icon: ClipboardCheck,
                  variant: "primary" as const,
                  onClick: () => router.push(`/warehouse/grnqc/qc/create?grnId=${grn.id}`),
                },
              ]
            : [],
      }}
    >
      <div className="w-full space-y-6">
        {/* Section 1: Header Info Cards */}
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
                  <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[140px]">
                    {card.val}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Section 2: Items Grid */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Section 2: Item Quantities
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">Ordered Qty</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-36">Received Qty</th>
                </tr>
              </thead>
              <tbody>
                {grn.items.map((it) => (
                  <tr key={it.productId} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-bold text-foreground">
                      {it.productName}
                      <span className="block text-[10px] text-muted-foreground font-mono">{it.productCode}</span>
                    </td>
                    <td className="px-4 py-2 text-xs text-center font-medium text-muted-foreground">
                      {it.orderedQty}
                    </td>
                    <td className="px-4 py-2 text-xs text-center font-bold text-brand-700 bg-brand-50/20">
                      {it.receivedQty}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Batch details */}
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Section 3: Lot Batch Distributions
          </h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-44">Batch/Lot No</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">Mfg Date</th>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold text-muted-foreground w-40">Expiry Date</th>
                  <th className="px-4 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {grn.batches.map((b, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">{b.productName}</td>
                    <td className="px-4 py-2 text-xs font-mono font-bold text-muted-foreground">{b.batchNumber}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{b.mfgDate || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{b.expDate || "—"}</td>
                    <td className="px-4 py-2 text-xs text-center font-bold">{b.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RecordDetailPage>
  );
}
