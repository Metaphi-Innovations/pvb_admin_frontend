"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Calendar, Building, Package, Layers, Info, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSalesOrderById, createPackingRecord } from "../../services";
import { getQcPassedStockList } from "../../../stockoverview/services";
import { SalesOrderRecord } from "../../types";

export default function CreatePackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);
  const [packingNo, setPackingNo] = useState("");
  const [packingDate, setPackingDate] = useState("");
  const [packingQty, setPackingQty] = useState<Record<string, number>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Mock available stock maps (product name + warehouse -> available quantity)
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});

  useEffect(() => {
    const record = getSalesOrderById(params.id);
    if (record) {
      setOrder(record);
      // Auto generate packing no
      setPackingNo(`PKG-2026-${Math.floor(100 + Math.random() * 900)}`);
      // Default to today
      setPackingDate(new Date().toISOString().split("T")[0]);

      // Initialize packing quantities
      const initialQty: Record<string, number> = {};
      record.products.forEach(p => {
        initialQty[p.sku] = p.pendingQty; // Default to pack all pending items
      });
      setPackingQty(initialQty);

      // Load available stock from Stock Overview module
      try {
        const stocks = getQcPassedStockList();
        const stockMap: Record<string, number> = {};
        record.products.forEach(p => {
          const matched = stocks.find(s => s.product === p.product && s.warehouse === record.warehouse);
          stockMap[p.sku] = matched ? matched.availableQuantity : 350; // Fallback to 350 if not found
        });
        setAvailableStock(stockMap);
      } catch (e) {
        // Fallback in case of module loading issues
        const stockMap: Record<string, number> = {};
        record.products.forEach(p => {
          stockMap[p.sku] = p.pendingQty + 50;
        });
        setAvailableStock(stockMap);
      }
    }
  }, [params.id]);

  if (!order) {
    return (
      <AppLayout>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <Info className="w-12 h-12 text-blue-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Sales Order Not Found</h1>
          <p className="text-xs text-muted-foreground">The sales order record you requested for packing does not exist.</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/packing")}>
            Go Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const handleQtyChange = (sku: string, value: string, pendingQty: number, maxAvailable: number) => {
    const val = parseInt(value, 10);
    const num = isNaN(val) ? 0 : val;

    setPackingQty(prev => ({
      ...prev,
      [sku]: num
    }));

    // Perform validation
    let err = "";
    if (num < 0) {
      err = "Quantity cannot be negative";
    } else if (num > pendingQty) {
      err = `Cannot exceed pending quantity of ${pendingQty}`;
    } else if (num > maxAvailable) {
      err = `Cannot exceed available warehouse stock of ${maxAvailable}`;
    }

    setValidationErrors(prev => ({
      ...prev,
      [sku]: err
    }));
  };

  const hasErrors = Object.values(validationErrors).some(err => err !== "");
  const totalQtyToPack = Object.values(packingQty).reduce((a, b) => a + b, 0);

  const handleSave = (isDraft: boolean) => {
    if (hasErrors) {
      alert("Please fix the validation errors before saving.");
      return;
    }
    if (totalQtyToPack <= 0) {
      alert("Please pack at least 1 item.");
      return;
    }

    createPackingRecord(order.id, packingQty, "Rahul S.", isDraft);
    router.push("/warehouse/packing");
  };

  return (
    <AppLayout>
      <div className="w-full space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={() => router.push("/warehouse/packing")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <p className="text-xs text-muted-foreground">
              Warehouse &rsaquo; Packing Management &rsaquo; Create Packing
            </p>
            <h1 className="text-lg font-bold text-foreground mt-0.5">
              Create Packing List
            </h1>
          </div>
        </div>

        {/* Header Information Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-600" />
            Packing Header Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packing No</p>
              <Input value={packingNo} disabled className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Order No</p>
              <Input value={order.salesOrderNo} disabled className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Customer</p>
              <Input value={order.customer} disabled className="h-8 text-xs bg-slate-50 font-medium mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
              <div className="flex items-center gap-1.5 h-8 border border-input px-3 rounded-md bg-slate-50 text-xs text-muted-foreground font-medium mt-1.5">
                <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                {order.warehouse}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Packing Date *</p>
              <div className="relative mt-1.5">
                <Input
                  type="date"
                  value={packingDate}
                  onChange={(e) => setPackingDate(e.target.value)}
                  className="h-8 text-xs focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Product Grid Card */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-brand-600" />
            Product Packing Grid
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/50">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Ordered Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Pending Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Available Stock</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[180px]">Packing Qty *</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map(p => {
                  const maxAvailable = availableStock[p.sku] ?? 0;
                  const currentQty = packingQty[p.sku] ?? 0;
                  const error = validationErrors[p.sku];

                  return (
                    <tr key={p.sku} className="border-b border-border/60 hover:bg-slate-50/40">
                      <td className="py-3 px-3 text-xs font-bold text-foreground">{p.product}</td>
                      <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                      <td className="py-3 px-3 text-xs font-semibold text-center">{p.orderedQty}</td>
                      <td className="py-3 px-3 text-xs font-bold text-center text-amber-600">{p.pendingQty}</td>
                      <td className="py-3 px-3 text-xs font-bold text-center text-emerald-600">{maxAvailable}</td>
                      <td className="py-2 px-3">
                        <div className="space-y-1">
                          <Input
                            type="number"
                            value={currentQty === 0 && isNaN(currentQty) ? "" : currentQty}
                            onChange={(e) => handleQtyChange(p.sku, e.target.value, p.pendingQty, maxAvailable)}
                            className={`h-8 text-xs font-bold text-right px-3 focus:ring-1 focus:ring-brand-500 ${
                              error ? "border-red-400 focus:ring-red-500 focus:border-red-500" : ""
                            }`}
                          />
                          {error && (
                            <p className="text-[10px] text-red-500 font-semibold">{error}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/warehouse/packing")}
            className="h-8 text-xs font-semibold"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSave(true)}
            className="h-8 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            disabled={hasErrors || totalQtyToPack <= 0}
            onClick={() => handleSave(false)}
            className="h-8 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Start Packing
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
