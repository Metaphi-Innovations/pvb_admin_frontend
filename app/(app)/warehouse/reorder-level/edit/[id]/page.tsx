"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Activity, Building, Package, Save } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getReorderById, saveReorder } from "../../services";
import { ReorderLevel, ReorderFormData } from "../../types";

export default function EditReorderLevelPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ReorderLevel | null>(null);
  const [reorderLevelQty, setReorderLevelQty] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      const r = getReorderById(id);
      if (r) {
        setRecord(r);
        setReorderLevelQty(String(r.reorderLevelQty));
      }
    }
  }, [id]);

  const validate = (): boolean => {
    const qty = Number(reorderLevelQty);
    if (!reorderLevelQty || isNaN(qty) || qty <= 0) {
      setError("Reorder Level Qty must be greater than 0.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSave = () => {
    if (!validate() || !record) return;
    const data: ReorderFormData = {
      warehouse: record.warehouse,
      product: record.product,
      sku: record.sku,
      category: record.category,
      reorderLevelQty: Number(reorderLevelQty),
    };
    saveReorder(data, id);
    router.push("/warehouse/reorder-level");
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading record...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => router.push("/warehouse/reorder-level")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">Warehouse &rsaquo; Reorder Level Management &rsaquo; Edit</p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">Edit Reorder Level</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand-600" /> Record Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Warehouse */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Warehouse</p>
              <div className="flex items-center gap-1.5 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-foreground">
                <Building className="w-3.5 h-3.5 text-brand-500" />
                {record.warehouse}
              </div>
            </div>

            {/* Product */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Product</p>
              <div className="flex items-center gap-1.5 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-foreground">
                <Package className="w-3.5 h-3.5 text-brand-500" />
                {record.product}
              </div>
            </div>

            {/* SKU */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">SKU</p>
              <div className="flex items-center h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-brand-700">
                {record.sku}
              </div>
            </div>

            {/* Current Stock */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Current Stock</p>
              <div className="flex items-center h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-foreground">
                {record.currentStock}
              </div>
            </div>

            {/* Reserved Stock */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Reserved Stock</p>
              <div className="flex items-center h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-amber-600">
                {record.reservedStock}
              </div>
            </div>

            {/* Reorder Level Qty */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                Reorder Level Qty *
              </p>
              <Input
                type="number"
                min={1}
                value={reorderLevelQty}
                onChange={e => { setReorderLevelQty(e.target.value); setError(""); }}
                className={`h-8 text-xs font-bold ${error ? "border-red-400" : ""}`}
              />
              {error && <p className="text-[10px] text-red-500 font-semibold mt-1">{error}</p>}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">
              When stock falls to or below this quantity, status becomes <span className="font-bold text-rose-600">Reorder Required</span>.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => router.push("/warehouse/reorder-level")}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
