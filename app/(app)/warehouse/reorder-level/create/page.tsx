"use client";

import React, { useState, useEffect, Suspense } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ArrowLeft, Activity, Package, Info, Warehouse } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveReorder } from "../services";
import { ReorderFormData } from "../types";
import { WAREHOUSE_OPTIONS, PRODUCT_OPTIONS } from "../constants";

const PRODUCT_META: Record<string, { sku: string; category: string }> = {
  "Urea 50kg":                { sku: "SKU-UR-50",  category: "Fertilizers" },
  "DAP 50kg":                 { sku: "SKU-DAP-50", category: "Fertilizers" },
  "NPK 10:26:26":             { sku: "SKU-NPK-26", category: "Fertilizers" },
  "Zinc Sulphate 21%":        { sku: "SKU-ZN-21",  category: "Micronutrients" },
  "Hybrid Maize Seed":        { sku: "SKU-MZ-12",  category: "Seeds" },
  "Potassium Nitrate":        { sku: "SKU-KN-01",  category: "Fertilizers" },
  "Calcium Ammonium Nitrate": { sku: "SKU-CAN-01", category: "Fertilizers" },
  "Ammonium Sulphate":        { sku: "SKU-AS-01",  category: "Fertilizers" },
};

function CreateReorderLevelForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // from=overview → apply to all warehouses, hide warehouse selector
  const fromOverview = searchParams.get("from") === "overview";
  const prefilledWarehouse = fromOverview ? "All" : (searchParams.get("warehouse") || "Central Warehouse");

  const [selectedWarehouse, setSelectedWarehouse] = useState(prefilledWarehouse);
  const [product, setProduct] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [reorderLevelQty, setReorderLevelQty] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product && PRODUCT_META[product]) {
      setSku(PRODUCT_META[product].sku);
      setCategory(PRODUCT_META[product].category);
    } else {
      setSku("");
      setCategory("");
    }
  }, [product]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!product) e.product = "Product is required.";
    const qty = Number(reorderLevelQty);
    if (!reorderLevelQty || isNaN(qty) || qty <= 0) e.reorderLevelQty = "Must be greater than 0.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const data: ReorderFormData = {
      warehouse: selectedWarehouse,
      product,
      sku,
      category,
      reorderLevelQty: Number(reorderLevelQty),
    };
    saveReorder(data);
    router.push("/warehouse/reorder-level");
  };

  const isAllWarehouses = selectedWarehouse === "All";
  const breadcrumb = fromOverview
    ? "Warehouse › Reorder Level Management › Set Reorder Level (All Warehouses)"
    : `Warehouse › Reorder Level Management › Set Reorder Level`;

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted" onClick={() => router.push("/warehouse/reorder-level")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">{breadcrumb}</p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">
              {fromOverview ? "Set Reorder Level — All Warehouses" : "Set Reorder Level"}
            </h1>
          </div>
        </div>

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
                    ...WAREHOUSE_OPTIONS,
                  ]}
                  value={selectedWarehouse}
                  onChange={setSelectedWarehouse}
                  placeholder="Select warehouse"
                  searchPlaceholder="Search warehouse..."
                  className="h-8 text-xs rounded-lg border-border bg-white"
                />
              </div>
            ) : (
              /* Overview flow: show locked "All Warehouses" chip */
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Warehouse</p>
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-brand-200 bg-brand-50 text-xs">
                  <Warehouse className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                  <span className="font-bold text-brand-700">All Warehouses</span>
                </div>
              </div>
            )}

            {/* Product */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Product *</p>
              <AutocompleteSelect
                options={PRODUCT_OPTIONS}
                value={product}
                onChange={setProduct}
                placeholder="Select product"
                searchPlaceholder="Search product..."
                error={!!errors.product}
                className="h-8 text-xs rounded-lg border-border bg-white"
              />
              {errors.product && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.product}</p>}
            </div>

            {/* Reorder Level Qty */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Reorder Level Qty *</p>
              <Input
                type="number"
                min={1}
                value={reorderLevelQty}
                onChange={e => setReorderLevelQty(e.target.value)}
                placeholder="e.g. 100"
                className={`h-8 text-xs font-bold ${errors.reorderLevelQty ? "border-red-400" : ""}`}
              />
              {errors.reorderLevelQty && <p className="text-[10px] text-red-500 font-semibold mt-1">{errors.reorderLevelQty}</p>}
            </div>

            {/* SKU — auto-filled */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">SKU</p>
              <Input value={sku} disabled placeholder="Auto-filled" className="h-8 text-xs bg-slate-50 font-mono font-bold" />
            </div>

            {/* Category — auto-filled */}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Category</p>
              <Input value={category} disabled placeholder="Auto-filled" className="h-8 text-xs bg-slate-50" />
            </div>
          </div>

          {/* Info banner */}
          {(isAllWarehouses || fromOverview) && (
            <div className="flex items-start gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2.5">
              <Info className="w-3.5 h-3.5 text-brand-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-brand-700 font-semibold leading-snug">
                This reorder level will be applied to <span className="font-bold">all 4 warehouses</span> for the selected product.
                Existing configurations will be updated; missing ones will be created automatically.
              </p>
            </div>
          )}
        </div>


        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button variant="outline" size="sm" className="h-8 text-xs font-semibold" onClick={() => router.push("/warehouse/reorder-level")}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={handleSave}>
            <Activity className="w-3.5 h-3.5" />
            {isAllWarehouses || fromOverview ? "Apply to All Warehouses" : "Save Reorder Level"}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}

export default function CreateReorderLevelPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading...</div>}>
      <CreateReorderLevelForm />
    </Suspense>
  );
}
