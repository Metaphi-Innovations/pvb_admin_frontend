"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, Building, Package, Save } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { ReorderLevelService } from "../../services";
import { ReorderLevel } from "../../types";
import { ListingStatusToggle } from "@/components/listing";

export default function EditReorderLevelPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<ReorderLevel | null>(null);
  const [reorderLevelQty, setReorderLevelQty] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      ReorderLevelService.getById(id).then((r) => {
        setRecord(r);
        // Keep exact numeric value without float noise (e.g. 500 not 499.999...)
        const qty = Number(r.reorderLevelQty);
        setReorderLevelQty(Number.isFinite(qty) ? String(qty) : "");
        setRemark(r.remark || "");
        setIsActive(r.isActive);
      }).catch(() => undefined);
    }
  }, [id]);

  const parseQty = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const qty = Number(trimmed);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return qty;
  };

  const validate = (): boolean => {
    if (parseQty(reorderLevelQty) == null) {
      setError("Reorder Level Qty must be greater than 0.");
      return false;
    }
    setError("");
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !record) return;
    if (saving) return;
    const qty = parseQty(reorderLevelQty);
    if (qty == null) return;
    try {
      setSaving(true);
      await ReorderLevelService.update(id, {
        reorder_level: qty,
        remark: remark.trim() || undefined,
        is_active: isActive,
      });
      router.push("/warehouse/reorder-level");
    } finally {
      setSaving(false);
    }
  };

  if (!record) {
    return (
      <FormContainer title="Edit Reorder Level" onBack={() => router.push("/warehouse/reorder-level")}>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading record...</div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Reorder Level"
      description={`Update safety stock alert levels for ${record.product}`}
      onBack={() => router.push("/warehouse/reorder-level")}
      onCancel={() => router.push("/warehouse/reorder-level")}
      cancelLabel="Cancel"
      actions={
        <Button size="sm" className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      }
      noCard={true}
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand-600" /> Record Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Warehouse / Type */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                {record.reorderType === "OVERALL" ? "Reorder Type" : "Warehouse"}
              </p>
              <div className="flex items-center gap-1.5 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-foreground">
                <Building className="w-3.5 h-3.5 text-brand-500" />
                {record.reorderType === "OVERALL" ? "Overall (Product Level)" : record.warehouse}
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
                {record.productCode}
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

            {/* Reorder Level Qty — text input avoids mouse-wheel changing type=number values */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">
                Reorder Level Qty *
              </p>
              <Input
                type="text"
                inputMode="decimal"
                value={reorderLevelQty}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.]/g, "");
                  setReorderLevelQty(next);
                  setError("");
                }}
                className={`h-8 text-xs font-bold ${error ? "border-red-400" : ""}`}
              />
              {error && <p className="text-[10px] text-red-500 font-semibold mt-1">{error}</p>}
            </div>
            <div className="sm:col-span-2 md:col-span-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Remark</p>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Status</p>
              <div className="h-8 flex items-center">
                <ListingStatusToggle active={isActive} onChange={setIsActive} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground">
              When stock falls to or below this quantity, status becomes <span className="font-bold text-rose-600">Reorder Required</span>.
            </p>
          </div>
        </div>
      </div>
    </FormContainer>
  );
}
