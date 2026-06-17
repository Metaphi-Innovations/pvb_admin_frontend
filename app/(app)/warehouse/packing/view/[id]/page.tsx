"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Calendar, Building, Package, Tag, AlertCircle,
  Layers, CheckSquare, ShieldAlert, FileText, ClipboardCheck, User
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getPackingUnionById } from "../../services";
import { PackingRecordUnion } from "../../types";
import { STATUS_BADGE_CONFIG } from "../../constants";

export default function ViewPackingDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [unionRecord, setUnionRecord] = useState<PackingRecordUnion | null>(null);

  useEffect(() => {
    const record = getPackingUnionById(params.id);
    if (record) {
      setUnionRecord(record);
    }
  }, [params.id]);

  if (!unionRecord) {
    return (
      <FormContainer title="Packing Details" onBack={() => router.push("/warehouse/packing")}>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Packing Record Not Found</h1>
          <p className="text-xs text-muted-foreground">The packing or sales order details record you requested does not exist.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/packing")}>
            Go Back
          </Button>
        </div>
      </FormContainer>
    );
  }

  const { type, data } = unionRecord;
  const statusCfg = STATUS_BADGE_CONFIG[data.status] || { bg: "bg-slate-100 text-slate-700 border-slate-200", label: data.status };

  return (
    <FormContainer
      title={type === "order" ? `Sales Order: ${(data as any).salesOrderNo}` : `Packing: ${(data as any).packingNo}`}
      description="Packing Details and batch lists"
      onBack={() => router.push("/warehouse/packing")}
      actions={
        <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
          {statusCfg.label}
        </span>
      }
      noCard={true}
    >
      <div className="space-y-6">

        {/* Sales Order View (Ready For Packing) */}
        {type === "order" && (
          <div className="space-y-6">
            {/* Header Information */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-brand-600" />
                Sales Order Information
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Order No</p>
                  <p className="text-xs font-mono font-bold text-brand-700 mt-1">{(data as any).salesOrderNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Customer</p>
                  <p className="text-xs font-bold text-foreground mt-1">{(data as any).customer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {data.warehouse}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Order Date</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).orderDate}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Delivery Date</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).deliveryDate}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Order Amount</p>
                  <p className="text-xs font-bold text-foreground mt-1">₹{Number((data as any).orderAmount).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Product Details
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/50">
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Ordered Qty</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Pending Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as any).products.map((p: any) => (
                      <tr key={p.sku} className="border-b border-border/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold text-foreground">{p.product}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                        <td className="py-3 px-3 text-xs font-semibold text-center">{p.orderedQty}</td>
                        <td className="py-3 px-3 text-xs font-bold text-center text-emerald-600">{p.packedQty}</td>
                        <td className="py-3 px-3 text-xs font-bold text-center text-amber-600">{p.pendingQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Completed Packing View (Packing Done) */}
        {type === "packing" && (
          <div className="space-y-6">
            {/* Header Information */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-brand-600" />
                Packing Information
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-4 pt-1">
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packing No</p>
                  <p className="text-xs font-mono font-bold text-brand-700 mt-1">{(data as any).packingNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Order No</p>
                  <p className="text-xs font-mono font-bold text-slate-700 mt-1">{(data as any).salesOrderNo}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Customer</p>
                  <p className="text-xs font-bold text-foreground mt-1">{(data as any).customer}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {data.warehouse}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packing Date</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).packingDate}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packed By</p>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-muted-foreground/60" />
                    {(data as any).packedBy}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Status</p>
                  <div className="mt-1">
                    <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Packed Products Grid */}
            <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Packed Products Details
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50/50">
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Ordered Qty</th>
                      <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data as any).products.map((p: any) => (
                      <tr key={p.sku} className="border-b border-border/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold text-foreground">{p.product}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                        <td className="py-3 px-3 text-xs font-semibold text-center">{p.orderedQty}</td>
                        <td className="py-3 px-3 text-xs font-bold text-center text-emerald-600">{p.packedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </FormContainer>
  );
}
