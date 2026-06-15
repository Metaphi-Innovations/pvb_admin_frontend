"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Calendar, Building, AlertCircle,
  Layers, CheckSquare, ShieldAlert, FileText, ClipboardCheck, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getStockById } from "../../services";
import { StockRecordUnion } from "../../types";
import { STATUS_BADGE_CONFIG } from "../../constants";

function stockStatusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  const s = status.toLowerCase();
  if (s.includes("available") || s.includes("reserved")) return "active";
  if (s.includes("reject") || s.includes("expired") || s.includes("low stock")) return "blocked";
  if (s.includes("pending") || s.includes("progress") || s.includes("awaiting")) return "draft";
  if (s.includes("disposed") || s.includes("out of stock")) return "inactive";
  return "neutral";
}

export default function ViewStockDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [stockUnion, setStockUnion] = useState<StockRecordUnion | null>(null);

  useEffect(() => {
    const record = getStockById(params.id);
    if (record) {
      setStockUnion(record);
    }
  }, [params.id]);

  if (!stockUnion) {
    return (
      <RecordDetailPage
        listHref="/warehouse/stockoverview"
        listLabel="Stock Overview"
        recordName="Stock Record Not Found"
        statusLabel="Not Found"
        statusVariant="blocked"
      >
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Stock Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The stock batch record you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/stockoverview")}>
            Go Back
          </Button>
        </div>
      </RecordDetailPage>
    );
  }

  const { type, data } = stockUnion;
  const statusCfg = STATUS_BADGE_CONFIG[data.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: data.status };
  const grnData = data as unknown as Record<string, unknown>;
  const qcData = data as unknown as Record<string, unknown>;

  return (
    <RecordDetailPage
      listHref="/warehouse/stockoverview"
      listLabel="Stock Overview"
      recordName={data.product}
      recordCode={data.batchNumber}
      statusLabel={statusCfg.label}
      statusVariant={stockStatusVariant(data.status)}
      metaItems={[
        { icon: Building, label: data.warehouse },
        ...(type === "grn-pending"
          ? [{ icon: FileText, label: String(grnData.grnNo ?? "") }]
          : []),
      ]}
      sidebar={{
        summary: [
          ...(type === "qc-passed"
            ? [
                { label: "Available Qty", value: String(qcData.availableQuantity ?? "—"), highlight: true },
                { label: "Reserved Qty", value: String(qcData.reservedQuantity ?? "—") },
                { label: "Threshold", value: String(qcData.threshold ?? "—") },
              ]
            : []),
          ...(type === "rejected"
            ? [
                { label: "Rejected Qty", value: `${qcData.rejectedQuantity ?? "—"} Units`, highlight: true },
                { label: "QC Number", value: String(qcData.qcNumber ?? "—") },
                { label: "Inspector", value: String(qcData.inspector ?? "—") },
              ]
            : []),
          ...(type === "grn-pending"
            ? [
                { label: "Received Qty", value: `${grnData.receivedQuantity ?? "—"} Units`, highlight: true },
                { label: "Vendor", value: String(grnData.vendor ?? "—") },
                { label: "GRN Date", value: String(grnData.grnDate ?? "—") },
              ]
            : []),
        ],
        quickActions:
          type === "grn-pending"
            ? [
                {
                  label: "Generate QC Report",
                  icon: ClipboardCheck,
                  variant: "primary" as const,
                  onClick: () =>
                    router.push(`/warehouse/grnqc/qc/create?grnId=${String(grnData.grnNo ?? "")}`),
                },
              ]
            : [],
      }}
    >
      <div className="space-y-6">

        {/* TAB 1: QC Passed Stock Details layout */}
        {type === "qc-passed" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Batch & Location Attributes */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Batch & Location details
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Product</p>
                    <p className="text-xs font-bold text-foreground mt-1">{data.product}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {data.warehouse}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Batch Number</p>
                    <p className="text-xs font-mono font-bold text-brand-700 mt-1">{data.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current Status</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Inventory & Quantity Details */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-brand-600" />
                  Inventory & Quantities
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Available Qty</p>
                    <p className="text-sm font-extrabold text-foreground mt-1">{(data as any).availableQuantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Reserved Qty</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">{(data as any).reservedQuantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Low Stock Threshold</p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">{(data as any).threshold}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Total Lot Quantity</p>
                    <p className="text-xs font-bold text-foreground mt-1">{(data as any).availableQuantity + (data as any).reservedQuantity}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Manufacturing & Shelf Life Dates */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-brand-600" />
                Manufacturing & Shelf Life dates
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Manufacturing Date</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{(data as any).manufacturingDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Expiry Date</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">{(data as any).expiryDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Rejected Stock Details layout */}
        {type === "rejected" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Product Information */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Product Information
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Product</p>
                    <p className="text-xs font-bold text-foreground mt-1">{data.product}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {data.warehouse}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Batch Number</p>
                    <p className="text-xs font-mono font-bold text-brand-700 mt-1">{data.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Rejected Quantity</p>
                    <p className="text-xs font-bold text-rose-600 mt-1">{(data as any).rejectedQuantity} Units</p>
                  </div>
                </div>
              </div>

              {/* QC Information */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <ClipboardCheck className="w-4 h-4 text-brand-600" />
                  QC Information
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">QC Number</p>
                    <p className="text-xs font-mono font-bold text-foreground mt-1">{(data as any).qcNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Inspection Date</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {(data as any).inspectionDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Inspector</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {(data as any).inspector}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rejection Information */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Rejection Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Reason</p>
                  <p className="text-xs font-bold text-rose-700 mt-1">{(data as any).rejectionReason}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Remarks</p>
                  <p className="text-xs text-muted-foreground bg-slate-50 border border-slate-200/60 rounded-lg p-3 mt-1.5 font-medium">
                    {(data as any).remarks || "No remarks provided."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GRN Pending Stock Details layout */}
        {type === "grn-pending" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* GRN Information */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand-600" />
                  GRN Information
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">GRN No</p>
                    <p className="text-xs font-mono font-bold text-brand-700 mt-1">{(data as any).grnNo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Vendor</p>
                    <p className="text-xs font-bold text-foreground mt-1">{(data as any).vendor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {data.warehouse}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">GRN Date</p>
                    <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                      {(data as any).grnDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Product Information */}
              <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Product Information
                </h2>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Product</p>
                    <p className="text-xs font-bold text-foreground mt-1">{data.product}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Batch Number</p>
                    <p className="text-xs font-mono font-bold text-brand-700 mt-1">{data.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Received Quantity</p>
                    <p className="text-sm font-extrabold text-foreground mt-1">{(data as any).receivedQuantity} Units</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QC Status Information */}
            <div className="bg-white rounded-xl border border-border p-4 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-brand-600" />
                QC Status Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Current Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Assigned Inspector</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).assignedInspector}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Inspection Due Date</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).inspectionDueDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RecordDetailPage>
  );
}
