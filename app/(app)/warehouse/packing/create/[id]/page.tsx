"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building, Package, Layers, Info, Check, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSalesOrderById, createPackingRecord } from "../../services";
import { getSellableQcPassedStockList } from "../../../stockoverview/services";
import { SalesOrderRecord } from "../../types";
import {
  buildDispatchNearExpiryEntries,
  defaultSingleBatchSelection,
  getActiveBatchSelection,
  selectSingleBatchAllocation,
} from "../../../dispatch/near-expiry-dispatch";
import {
  BatchAllocationSection,
  buildBatchAllocationMapFromSelections,
} from "../../../dispatch/components/BatchAllocationSection";
import { NearExpirySchemeInfoPanel } from "../../../dispatch/components/NearExpirySchemeInfoPanel";

export default function CreatePackingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<SalesOrderRecord | null>(null);
  const [packingNo, setPackingNo] = useState("");
  const [packingDate, setPackingDate] = useState("");
  const [packingQty, setPackingQty] = useState<Record<string, number>>({});
  const [batchSelections, setBatchSelections] = useState<Record<string, Record<string, number>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [availableStock, setAvailableStock] = useState<Record<string, number>>({});

  useEffect(() => {
    const record = getSalesOrderById(params.id);
    if (record) {
      setOrder(record);
      setPackingNo(`PKG-2026-${Math.floor(100 + Math.random() * 900)}`);
      setPackingDate(new Date().toISOString().split("T")[0]);

      const initialQty: Record<string, number> = {};
      const initialSelections: Record<string, Record<string, number>> = {};
      record.products.forEach((p) => {
        initialQty[p.sku] = p.pendingQty;
        initialSelections[p.sku] = defaultSingleBatchSelection(
          p.product,
          record.warehouse,
          p.pendingQty,
        );
      });
      setPackingQty(initialQty);
      setBatchSelections(initialSelections);

      try {
        const stocks = getSellableQcPassedStockList();
        const stockMap: Record<string, number> = {};
        record.products.forEach((p) => {
          const matched = stocks.filter(
            (s) => s.product === p.product && s.warehouse === record.warehouse,
          );
          stockMap[p.sku] = matched.reduce((sum, row) => sum + row.availableQuantity, 0) || 350;
        });
        setAvailableStock(stockMap);
      } catch {
        const stockMap: Record<string, number> = {};
        record.products.forEach((p) => {
          stockMap[p.sku] = p.pendingQty + 50;
        });
        setAvailableStock(stockMap);
      }
    }
  }, [params.id]);

  const warehouseName = order
    ? order.sourceDocumentType === "Stock Transfer"
      ? order.sourceWarehouse ?? order.warehouse
      : order.warehouse
    : "";
  const customerName = order
    ? order.sourceDocumentType === "Stock Transfer"
      ? order.targetWarehouse ?? order.customer
      : order.customer
    : "";

  const batchAllocationMap = useMemo(() => {
    if (!order) return {};
    return buildBatchAllocationMapFromSelections(
      order.products.map((p) => ({
        productName: p.product,
        sku: p.sku,
        warehouse: warehouseName,
        selections: batchSelections[p.sku] ?? {},
      })),
    );
  }, [order, batchSelections, warehouseName]);

  const nearExpirySchemeEntries = useMemo(() => {
    const entries: ReturnType<typeof buildDispatchNearExpiryEntries> = [];
    if (!order) return entries;
    order.products.forEach((p) => {
      const qty = packingQty[p.sku] ?? 0;
      if (qty <= 0) return;
      const allocations = batchAllocationMap[p.sku] ?? [];
      if (!allocations.length) return;
      entries.push(
        ...buildDispatchNearExpiryEntries({
          productName: p.product,
          sku: p.sku,
          warehouse: warehouseName,
          customerName: customerName ?? "",
          quantity: qty,
          batchAllocations: allocations,
        }),
      );
    });
    return entries;
  }, [order, packingQty, batchAllocationMap, warehouseName, customerName]);

  const isNearExpiryDemoOrder = order?.id === "so-ne-demo";

  if (!order) {
    return (
      <FormContainer title="Sales Order" onBack={() => router.push("/warehouse/packing")}>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <Info className="w-12 h-12 text-blue-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Sales Order Not Found</h1>
          <p className="text-xs text-muted-foreground">
            The sales order record you requested for packing does not exist.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push("/warehouse/packing")}>
            Go Back
          </Button>
        </div>
      </FormContainer>
    );
  }

  const handleQtyChange = (sku: string, value: string, pendingQty: number, maxAvailable: number) => {
    const val = parseInt(value, 10);
    const num = Number.isNaN(val) ? 0 : val;
    const product = order.products.find((p) => p.sku === sku);

    setPackingQty((prev) => ({ ...prev, [sku]: num }));
    if (product) {
      setBatchSelections((prev) => {
        const current = prev[sku] ?? {};
        const activeBatch = getActiveBatchSelection(current);
        if (activeBatch) {
          return {
            ...prev,
            [sku]: selectSingleBatchAllocation(
              product.product,
              warehouseName,
              activeBatch,
              num,
            ),
          };
        }
        return {
          ...prev,
          [sku]: defaultSingleBatchSelection(product.product, warehouseName, num),
        };
      });
    }

    let err = "";
    if (num < 0) err = "Quantity cannot be negative";
    else if (num > pendingQty) err = `Cannot exceed pending quantity of ${pendingQty}`;
    else if (num > maxAvailable) err = `Cannot exceed available warehouse stock of ${maxAvailable}`;

    setValidationErrors((prev) => ({ ...prev, [sku]: err }));
  };

  const hasErrors = Object.values(validationErrors).some((err) => err !== "");
  const totalQtyToPack = Object.values(packingQty).reduce((a, b) => a + b, 0);

  const batchAllocationErrors = order.products.some((p) => {
    const qty = packingQty[p.sku] ?? 0;
    if (qty <= 0) return false;
    const selected = Object.values(batchSelections[p.sku] ?? {}).reduce((sum, n) => sum + n, 0);
    return selected !== qty;
  });

  const handleSave = (isDraft: boolean) => {
    if (hasErrors || batchAllocationErrors) {
      alert("Please fix validation errors and match batch selections to packing quantity.");
      return;
    }
    if (totalQtyToPack <= 0) {
      alert("Please pack at least 1 item.");
      return;
    }

    createPackingRecord(
      order.id,
      packingQty,
      "Rahul S.",
      isDraft,
      batchAllocationMap,
      nearExpirySchemeEntries,
    );
    router.push("/warehouse/packing");
  };

  return (
    <FormContainer
      title="Create Packing List"
      description={`Generate packing allocations for ${order.salesOrderNo}`}
      onBack={() => router.push("/warehouse/packing")}
      onCancel={() => router.push("/warehouse/packing")}
      cancelLabel="Cancel"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={hasErrors || batchAllocationErrors || totalQtyToPack <= 0}
            onClick={() => handleSave(false)}
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Start Packing
          </Button>
        </div>
      }
      noCard={false}
    >
      <div className="space-y-6">
        {isNearExpiryDemoOrder && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2.5">
            <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Near Expiry Demo Order
            </p>
            <p className="mt-1 text-[11px] text-orange-800">
              Customer <strong>Agro Solutions Pvt Ltd</strong> (Distributor, Maharashtra) · Product{" "}
              <strong>Bio Fertilizer A</strong> · Select qty from batch <strong>B001</strong> (expires
              within 30 days) to see <strong>Near Expiry Scheme Eligible</strong>.
            </p>
          </div>
        )}

        <div className="space-y-4">
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
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {order.sourceDocumentType === "Stock Transfer" ? "Source Document No." : "Sales Order No"}
              </p>
              <Input
                value={order.sourceDocumentType === "Stock Transfer" ? order.sourceDocumentNo : order.salesOrderNo}
                disabled
                className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {order.sourceDocumentType === "Stock Transfer" ? "Target Warehouse" : "Customer"}
              </p>
              <Input
                value={order.sourceDocumentType === "Stock Transfer" ? order.targetWarehouse : order.customer}
                disabled
                className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                {order.sourceDocumentType === "Stock Transfer" ? "Source Warehouse" : "Warehouse"}
              </p>
              <div className="flex items-center gap-1.5 h-8 border border-input px-3 rounded-md bg-slate-50 text-xs text-muted-foreground font-medium mt-1.5">
                <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                {order.sourceDocumentType === "Stock Transfer" ? order.sourceWarehouse : order.warehouse}
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

        <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
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
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                    {order.sourceDocumentType === "Stock Transfer" ? "Transfer Qty" : "Ordered Qty"}
                  </th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Pending Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Available Stock</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[180px]">Packing Qty *</th>
                </tr>
              </thead>
              <tbody>
                {order.products.map((p) => {
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
                            value={currentQty === 0 ? "" : currentQty}
                            onChange={(e) => handleQtyChange(p.sku, e.target.value, p.pendingQty, maxAvailable)}
                            className={`h-8 text-xs font-bold text-right px-3 focus:ring-1 focus:ring-brand-500 ${
                              error ? "border-red-400" : ""
                            }`}
                          />
                          {error && <p className="text-[10px] text-red-500 font-semibold">{error}</p>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-border/80 pt-6 mt-6 space-y-3">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
            Batch Allocation by Product
          </h2>
          {order.products.map((p) => (
            <BatchAllocationSection
              key={p.sku}
              productName={p.product}
              sku={p.sku}
              requiredQty={packingQty[p.sku] ?? 0}
              warehouse={warehouseName}
              customerName={customerName ?? ""}
              selections={batchSelections[p.sku] ?? {}}
              onSelectionsChange={(next) =>
                setBatchSelections((prev) => ({ ...prev, [p.sku]: next }))
              }
              qtyLabel="Required Qty"
            />
          ))}
        </div>

        {nearExpirySchemeEntries.length > 0 && (
          <NearExpirySchemeInfoPanel entries={nearExpirySchemeEntries} />
        )}
      </div>
    </FormContainer>
  );
}
