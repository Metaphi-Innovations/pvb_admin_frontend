"use client";

import React, { useState, useEffect, Suspense } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Activity, Info, Warehouse } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReorderLevelService } from "../services";
import { ReorderFormData } from "../types";

function CreateReorderLevelForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // from=overview → OVERALL reorder type (product-level), hide warehouse selector
  const fromOverview = searchParams.get("from") === "overview";
  const prefilledWarehouse = fromOverview ? "All" : (searchParams.get("warehouse") || "");

  const [selectedWarehouse, setSelectedWarehouse] = useState(prefilledWarehouse || "All");
  const [warehouseOptions, setWarehouseOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "All", label: "All Warehouses" },
  ]);
  const [productOptions, setProductOptions] = useState<
    Array<{ value: string; label: string; productCode: string; category: string; unit: string }>
  >([]);
  const [productId, setProductId] = useState("");
  const [productCode, setProductCode] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [reorderLevelQty, setReorderLevelQty] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ReorderLevelService.warehouseDropdown()
      .then((items) => {
        setWarehouseOptions([{ value: "All", label: "All Warehouses" }, ...items]);
      })
      .catch(() => undefined);
    ReorderLevelService.productDropdown()
      .then((items) => setProductOptions(items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const selected = productOptions.find((item) => item.value === productId);
    if (selected) {
      setProductCode(selected.productCode);
      setCategory(selected.category);
      setUnit(selected.unit);
    } else {
      setProductCode("");
      setCategory("");
      setUnit("");
    }
  }, [productId, productOptions]);

  const parseQty = (raw: string): number | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const qty = Number(trimmed);
    if (!Number.isFinite(qty) || qty <= 0) return null;
    return qty;
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!productId) e.product = "Product is required.";
    if (parseQty(reorderLevelQty) == null) e.reorderLevelQty = "Must be greater than 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (saving) return;
    const qty = parseQty(reorderLevelQty);
    if (qty == null) return;
    const isOverall = fromOverview || selectedWarehouse === "All";
    const data: ReorderFormData = {
      master_item_id: productId,
      reorder_type: isOverall ? "OVERALL" : "WAREHOUSE",
      warehouse_id: isOverall ? null : selectedWarehouse,
      reorder_level: qty,
      remark: remark.trim() || undefined,
    };
    try {
      setSaving(true);
      await ReorderLevelService.create(data);
      router.push("/warehouse/reorder-level");
    } finally {
      setSaving(false);
    }
  };

  const isAllWarehouses = selectedWarehouse === "All";
  return (
    <FormContainer
      title={fromOverview ? "Set Overall Reorder Level" : "Set Reorder Level"}
      description="Configure safety stock threshold alerts"
      onBack={() => router.push("/warehouse/reorder-level")}
      onCancel={() => router.push("/warehouse/reorder-level")}
      cancelLabel="Cancel"
      actions={
        <Button size="sm" className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={handleSave}>
          <Activity className="w-3.5 h-3.5" />
          {saving ? "Saving..." : fromOverview || isAllWarehouses ? "Save Overall Reorder Level" : "Save Reorder Level"}
        </Button>
      }
      noCard={true}
    >
      <div className="space-y-6">
        {/* Configuration Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-5">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-brand-600" /> Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

            {/* Warehouse — shown only in Warehouse Wise flow */}
            {!fromOverview ? (
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Warehouse *</p>
                <AutocompleteSelect
                  options={[
                    {
                      value: "All",
                      label: "All Warehouses",
                      icon: <Warehouse className="w-3.5 h-3.5 text-brand-500" />,
                    },
                    ...warehouseOptions.filter((item) => item.value !== "All"),
                  ]}
                  value={selectedWarehouse}
                  onChange={setSelectedWarehouse}
                  placeholder="Select warehouse"
                  searchPlaceholder="Search warehouse..."
                  className="h-8 text-xs rounded-lg border-border bg-white"
                />
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Reorder Type</p>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-brand-200 bg-brand-50 text-xs">
                  <Warehouse className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="font-bold text-brand-700">Overall (Product Level)</span>
                </div>
              </div>
            )}

            {/* Product */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Product *</p>
              <AutocompleteSelect
                options={productOptions}
                value={productId}
                onChange={setProductId}
                placeholder="Select product"
                searchPlaceholder="Search product..."
                error={!!errors.product}
                className="h-8 text-xs rounded-lg border-border bg-white"
              />
              {errors.product && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.product}</p>}
            </div>

            {/* Reorder Level Qty — text input avoids mouse-wheel changing type=number values */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Reorder Level Qty *</p>
              <Input
                type="text"
                inputMode="decimal"
                value={reorderLevelQty}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^\d.]/g, "");
                  setReorderLevelQty(next);
                }}
                placeholder="e.g. 100"
                className={`h-8 text-xs font-bold ${errors.reorderLevelQty ? "border-red-400" : ""}`}
              />
              {errors.reorderLevelQty && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.reorderLevelQty}</p>}
            </div>

            {/* SKU — auto-filled */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">SKU</p>
              <Input value={productCode} disabled placeholder="Auto-filled" className="h-8 text-xs bg-slate-50 font-mono font-bold" />
            </div>

            {/* Category — auto-filled */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Category</p>
              <Input value={category} disabled placeholder="Auto-filled" className="h-8 text-xs bg-slate-50" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Unit</p>
              <Input value={unit} disabled placeholder="Auto-filled" className="h-8 text-xs bg-slate-50" />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Remark</p>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional remark"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Info banner */}
          {(isAllWarehouses || fromOverview) && (
            <div className="flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5">
              <Info className="w-3.5 h-3.5 text-brand-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-brand-700 font-semibold leading-snug">
                This sets an <span className="font-bold">overall (product-level)</span> reorder threshold using stock across all warehouses.
              </p>
            </div>
          )}
        </div>
      </div>
    </FormContainer>
  );
}

export default function CreateReorderLevelPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading...</div>}>
      <CreateReorderLevelForm />
    </Suspense>
  );
}
