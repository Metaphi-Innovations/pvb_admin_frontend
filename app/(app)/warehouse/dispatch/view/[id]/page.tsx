"use client";

import React, { useEffect, useState } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import { Truck, Package, Building, User, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getDispatchById } from "../../services";
import { DispatchRecord } from "../../types";
import { DELIVERY_STATUS_BADGE_CONFIG } from "../../constants";

export default function ViewDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<DispatchRecord | null>(null);

  useEffect(() => {
    if (id) setRecord(getDispatchById(id) || null);
  }, [id]);

  if (!record) {
    return (
      <RecordDetailPage
        listHref="/warehouse/dispatch"
        listLabel="Dispatch"
        recordName="Dispatch Details"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading dispatch record...</div>
      </RecordDetailPage>
    );
  }

  const statusConfig = DELIVERY_STATUS_BADGE_CONFIG[record.deliveryStatus] || { bg: "bg-slate-100 text-slate-600 border-slate-200", label: record.deliveryStatus };
  const statusVariant =
    record.deliveryStatus === "Delivered" ? "active" :
    record.deliveryStatus === "Cancelled" || record.deliveryStatus === "Returned" ? "blocked" :
    record.deliveryStatus === "Pending Dispatch" ? "draft" : "neutral";

  return (
    <RecordDetailPage
      listHref="/warehouse/dispatch"
      listLabel="Dispatch"
      recordName={record.dispatchNumber}
      recordCode={record.salesOrderNumber}
      statusLabel={statusConfig.label}
      statusVariant={statusVariant}
      metaItems={[
        { 
          icon: record.sourceDocumentType === "Stock Transfer" ? Building : User, 
          label: record.sourceDocumentType === "Stock Transfer" ? (record.targetWarehouse || record.customer) : record.customer 
        },
        { icon: Building, label: record.warehouse },
        { icon: Calendar, label: record.dispatchDate },
      ]}
      onEdit={record.deliveryStatus !== "Delivered" ? () => router.push(`/warehouse/dispatch/edit/${record.id}`) : undefined}
      sidebar={{
        summary: [
          { label: "Vehicle", value: record.vehicleNumber, highlight: true },
          { label: "Driver", value: record.driverName },
          { label: "Transporter", value: record.transporterName || "—" },
          { label: "Products", value: record.products.length },
        ],
        quickActions:
          record.deliveryStatus !== "Delivered"
            ? [
                {
                  label: "Edit Dispatch",
                  icon: Truck,
                  variant: "primary" as const,
                  onClick: () => router.push(`/warehouse/dispatch/edit/${record.id}`),
                },
              ]
            : [],
      }}
    >
      <div className="space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { 
              label: record.sourceDocumentType === "Stock Transfer" ? "Stock Transfer No" : "Sales Order No", 
              value: record.salesOrderNumber, 
              icon: Package 
            },
            { 
              label: record.sourceDocumentType === "Stock Transfer" ? "Target Warehouse" : "Customer", 
              value: record.sourceDocumentType === "Stock Transfer" ? (record.targetWarehouse || record.customer) : record.customer, 
              icon: record.sourceDocumentType === "Stock Transfer" ? Building : User 
            },
            { 
              label: record.sourceDocumentType === "Stock Transfer" ? "Source Warehouse" : "Warehouse", 
              value: record.warehouse, 
              icon: Building 
            },
            { label: "Dispatch Date", value: record.dispatchDate, icon: Calendar },
          ].map(card => (
            <div key={card.label} className="bg-white border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                  <card.icon className="w-3.5 h-3.5 text-brand-600" />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
              </div>
              <p className="text-sm font-bold text-foreground leading-tight">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Vehicle & Transport Details */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Truck className="w-4 h-4 text-brand-600" /> Vehicle & Transport Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              { label: "Vehicle Number", value: record.vehicleNumber },
              { label: "Driver Name", value: record.driverName },
              { label: "Transporter Name", value: record.transporterName || "—" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</p>
                <p className="text-sm font-bold text-foreground mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Package className="w-4 h-4 text-brand-600" /> Dispatched Products
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Dispatch Qty</th>
                </tr>
              </thead>
              <tbody>
                {record.products.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-slate-50/40">
                    <td className="py-3 px-3 text-xs font-bold">{p.product}</td>
                    <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                    <td className="py-3 px-3 text-xs font-bold text-center">{p.packedQty}</td>
                    <td className="py-3 px-3 text-xs font-bold text-center">{p.dispatchQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delivery Details (if delivered) */}
        {record.deliveryDetails && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h2 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-2 flex items-center gap-1.5 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Delivery Confirmation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Delivery Date</p>
                <p className="text-sm font-bold text-emerald-900 mt-1">{record.deliveryDetails.deliveryDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Received By</p>
                <p className="text-sm font-bold text-emerald-900 mt-1">{record.deliveryDetails.receiverName}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Remarks</p>
                <p className="text-sm font-bold text-emerald-900 mt-1">{record.deliveryDetails.remarks || "—"}</p>
              </div>
            </div>
          </div>
        )}

        {/* Packing References */}
        {record.packingNumbers?.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
              <AlertTriangle className="w-4 h-4 text-brand-600" /> Linked Packing References
            </h2>
            <div className="flex flex-wrap gap-2">
              {record.packingNumbers.map(pn => (
                <span key={pn} className="inline-flex items-center text-xs font-mono font-bold px-3 py-1.5 rounded-lg border border-brand-200 bg-brand-50 text-brand-700">
                  {pn}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </RecordDetailPage>
  );
}
