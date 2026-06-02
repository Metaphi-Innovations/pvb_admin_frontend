"use client";

import React, { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, Building, Package, BarChart2, Pencil } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getReorderById, getReordersByProduct } from "../../services";
import { ReorderLevel } from "../../types";
import { STATUS_BADGE_CONFIG } from "../../constants";

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_BADGE_CONFIG[status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

export default function ViewReorderLevelPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ReorderLevel | null>(null);
  const [sameProductRecords, setSameProductRecords] = useState<ReorderLevel[]>([]);

  useEffect(() => {
    if (id) {
      const r = getReorderById(id);
      if (r) {
        setRecord(r);
        setSameProductRecords(getReordersByProduct(r.product));
      }
    }
  }, [id]);

  const statusConfig = useMemo(
    () => record ? (STATUS_BADGE_CONFIG[record.status] || { bg: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" }) : null,
    [record]
  );

  if (!record || !statusConfig) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading record...</div>
      </AppLayout>
    );
  }

  const availableStock = record.currentStock - record.reservedStock;
  const stockPercent = record.reorderLevelQty > 0
    ? Math.min(100, Math.round((record.currentStock / (record.reorderLevelQty * 2)) * 100))
    : 100;

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => router.push("/warehouse/reorder-level")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <p className="text-xs text-muted-foreground">Warehouse &rsaquo; Reorder Level Management &rsaquo; View</p>
              <h1 className="text-lg font-bold text-foreground mt-0.5">{record.product}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={record.status} />
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => router.push(`/warehouse/reorder-level/edit/${record.id}`)}>
              <Pencil className="w-3 h-3" /> Edit
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Current Stock", value: record.currentStock, color: "text-foreground" },
            { label: "Reserved Stock", value: record.reservedStock, color: "text-amber-600" },
            { label: "Available Stock", value: availableStock, color: availableStock < 0 ? "text-rose-600" : "text-emerald-600" },
            { label: "Reorder Level Qty", value: record.reorderLevelQty, color: "text-brand-600" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-border rounded-xl p-4 shadow-sm text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{card.label}</p>
              <p className={`text-2xl font-bold mt-1 ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Stock progress bar */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Stock Level vs Reorder Level Qty</p>
            <p className="text-xs text-muted-foreground">
              Threshold: <span className="font-bold text-foreground">{record.reorderLevelQty}</span>
            </p>
          </div>
          <div className="relative h-4 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                record.status === "In Stock" ? "bg-emerald-500" :
                record.status === "Low Stock" ? "bg-rose-500" :
                "bg-slate-400"
              }`}
              style={{ width: `${stockPercent}%` }}
            />
            <div className="absolute top-0 left-[50%] w-0.5 h-full bg-slate-500 opacity-50" title="Reorder Level Qty" />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
            <span>0</span>
            <span className="text-slate-500">↑ Reorder Level Qty: {record.reorderLevelQty}</span>
            <span>{record.reorderLevelQty * 2}+</span>
          </div>
        </div>

        {/* Product info */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
            <Package className="w-4 h-4 text-brand-600" /> Product Information
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              { label: "Product", value: record.product },
              { label: "SKU", value: record.sku, mono: true },
              { label: "Category", value: record.category },
              { label: "Warehouse", value: record.warehouse },
              { label: "Last Updated", value: record.lastUpdated },
              { label: "Reorder Level Qty", value: record.reorderLevelQty },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</p>
                <p className={`text-sm font-bold text-foreground mt-1 ${item.mono ? "font-mono text-brand-700" : ""}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-warehouse comparison */}
        {sameProductRecords.length > 1 && (
          <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-4">
              <BarChart2 className="w-4 h-4 text-brand-600" />
              {record.product} — All Warehouses Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    {["Warehouse", "Current Stock", "Reserved Stock", "Reorder Level Qty", "Status"].map(h => (
                      <th key={h} className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sameProductRecords.map(r => (
                    <tr key={r.id} className={`border-b border-border/60 hover:bg-slate-50/40 ${r.id === record.id ? "bg-brand-50/40" : ""}`}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                          <span className={`text-xs font-bold ${r.id === record.id ? "text-brand-700" : "text-foreground"}`}>
                            {r.warehouse}
                            {r.id === record.id && (
                              <span className="ml-1.5 text-[10px] bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded font-semibold">Current</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-center">{r.currentStock}</td>
                      <td className="py-3 px-3 text-xs font-bold text-center text-amber-600">{r.reservedStock}</td>
                      <td className="py-3 px-3 text-xs font-bold text-center text-brand-600">{r.reorderLevelQty}</td>
                      <td className="py-3 px-3"><StatusBadge status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => router.push("/warehouse/reorder-level")}>
            Back to List
          </Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={() => router.push(`/warehouse/reorder-level/edit/${record.id}`)}>
            <Pencil className="w-3.5 h-3.5" /> Edit Level
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
