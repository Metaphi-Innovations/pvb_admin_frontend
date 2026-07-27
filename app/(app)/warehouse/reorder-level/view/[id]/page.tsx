"use client";

import React, { useEffect, useState, useMemo } from "react";
import { RecordDetailPage } from "@/components/record-detail";
import { Activity, Building, Package, BarChart2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { ReorderLevelService } from "../../services";
import { ReorderLevel } from "../../types";

function StatusBadge({ status }: { status: string }) {
  const cfg = status === "Low Stock"
    ? { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" }
    : { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
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
      ReorderLevelService.getById(id)
        .then((r) => {
          setRecord(r);
          if (r.reorderType === "OVERALL") {
            setSameProductRecords([]);
            return null;
          }
          return ReorderLevelService.list({
            page: 1,
            pageSize: 200,
            search: "",
            reorder_type: "WAREHOUSE",
            filters: { product: [r.product] },
          });
        })
        .then((res) => {
          if (res) setSameProductRecords(res.items);
        })
        .catch(() => undefined);
    }
  }, [id]);

  const statusConfig = useMemo(
    () => record ? (record.status === "Low Stock"
      ? { bg: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" }
      : { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" }) : null,
    [record]
  );

  if (!record || !statusConfig) {
    return (
      <RecordDetailPage
        listHref="/warehouse/reorder-level"
        listLabel="Reorder Levels"
        recordName="Reorder Level"
        statusLabel="Loading"
        statusVariant="neutral"
      >
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading record...</div>
      </RecordDetailPage>
    );
  }

  const availableStock = record.currentStock - record.reservedStock;
  const stockPercent = record.reorderLevelQty > 0
    ? Math.min(100, Math.round((record.currentStock / (record.reorderLevelQty * 2)) * 100))
    : 100;

  const statusVariant =
    record.status === "In Stock" ? "active" :
    record.status === "Low Stock" ? "blocked" : "neutral";

  return (
    <RecordDetailPage
      listHref="/warehouse/reorder-level"
      listLabel="Reorder Levels"
      recordName={record.product}
      recordCode={record.productCode}
      statusLabel={record.status}
      statusVariant={statusVariant}
      metaItems={[
        {
          icon: Building,
          label: record.reorderType === "OVERALL" ? "Overall (Product Level)" : record.warehouse,
        },
        { icon: Package, label: record.category },
      ]}
      onEdit={() => router.push(`/warehouse/reorder-level/edit/${record.id}`)}
      sidebar={{
        summary: [
          { label: "Current Stock", value: record.currentStock, highlight: true },
          { label: "Reserved Stock", value: record.reservedStock },
          { label: "Available Stock", value: availableStock },
          { label: "Reorder Level Qty", value: record.reorderLevelQty },
          { label: "Last Updated", value: record.updatedDate },
        ],
      }}
    >
      <div className="space-y-6">

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
              { label: "Product Code", value: record.productCode, mono: true },
              { label: "Category", value: record.category },
              {
                label: record.reorderType === "OVERALL" ? "Reorder Type" : "Warehouse",
                value: record.reorderType === "OVERALL" ? "Overall (Product Level)" : record.warehouse,
              },
              { label: "Last Updated", value: record.updatedDate },
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

      </div>
    </RecordDetailPage>
  );
}
