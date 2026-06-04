"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Building, Landmark, Receipt, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getGrnById } from "../../mock-data";
import { GrnRecord } from "../../types";

const STATUS_CONFIG = {
  draft: { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Draft" },
  submitted: { bg: "bg-blue-50 text-blue-700 border-blue-200", label: "Submitted" },
  qc_pending: { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "QC Pending" },
  qc_completed: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "QC Completed" },
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
      <AppLayout>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">GRN Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The GRN ID you requested does not exist or has been removed.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/grnqc")}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[grn.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: "Unknown" };

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Top Header Block */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-muted"
              onClick={() => router.push("/warehouse/grnqc")}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground font-mono">{grn.grnNo}</h1>
                <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Goods Receipt Note Summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {grn.status === "qc_pending" && (
              <Button
                size="sm"
                onClick={() => router.push(`/warehouse/grnqc/qc/create?grnId=${grn.id}`)}
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white rounded-lg"
              >
                Perform QC Check
              </Button>
            )}
          </div>
        </div>

        {/* Section 1: Header Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "PO Number", val: grn.poNumber, icon: Receipt },
            { label: "Vendor", val: grn.vendorName, icon: Landmark },
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
    </AppLayout>
  );
}
