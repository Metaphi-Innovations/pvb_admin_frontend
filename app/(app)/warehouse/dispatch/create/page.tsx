"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Truck, Building, Package, CheckSquare, Check, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPackedOrdersByWarehouse, saveDispatch, generateDispatchNumber } from "../services";
import { getPackingRecordById } from "../../packing/services";
import { PackingRecord } from "../../packing/types";
import { DispatchProduct, DispatchRecord } from "../types";
import { WAREHOUSE_OPTIONS, DELIVERY_STATUS_OPTIONS } from "../constants";
import {
  batchSelectionsToAllocations,
  buildDispatchNearExpiryEntries,
  defaultSingleBatchSelection,
  distributeFefoBatchSelections,
} from "../near-expiry-dispatch";
import {
  BatchAllocationSection,
} from "../components/BatchAllocationSection";
import { NearExpirySchemeInfoPanel } from "../components/NearExpirySchemeInfoPanel";

function rowKey(orderId: string, sku: string) {
  return `${orderId}::${sku}`;
}

function selectionsFromPackingBatches(
  productName: string,
  warehouse: string,
  dispatchQty: number,
  packingBatches: { batchNumber: string; expiryDate: string; allocatedQty: number }[],
): Record<string, number> {
  if (!packingBatches.length) {
    return defaultSingleBatchSelection(productName, warehouse, dispatchQty);
  }
  if (packingBatches.length === 1) {
    const batch = packingBatches[0];
    return {
      [batch.batchNumber]: Math.min(dispatchQty, batch.allocatedQty),
    };
  }
  const selections: Record<string, number> = {};
  let remaining = dispatchQty;
  for (const batch of packingBatches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.allocatedQty);
    if (take <= 0) continue;
    selections[batch.batchNumber] = take;
    remaining -= take;
  }
  if (remaining > 0) {
    const extra = distributeFefoBatchSelections(productName, warehouse, remaining);
    for (const [batchNumber, qty] of Object.entries(extra)) {
      selections[batchNumber] = (selections[batchNumber] ?? 0) + qty;
    }
  }
  return selections;
}

export default function CreateDispatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packingId = searchParams ? searchParams.get("packingId") : null;

  const [packingNo, setPackingNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("Pending Dispatch");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All");

  const [packedOrders, setPackedOrders] = useState<PackingRecord[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [dispatchQtyMap, setDispatchQtyMap] = useState<Record<string, number>>({});
  const [batchSelections, setBatchSelections] = useState<Record<string, Record<string, number>>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPackingNo(generateDispatchNumber());
  }, []);

  useEffect(() => {
    if (packingId) {
      const record = getPackingRecordById(packingId);
      if (record) {
        setSelectedWarehouse(record.warehouse || record.sourceWarehouse || "All");
      }
    }
  }, [packingId]);

  useEffect(() => {
    const orders = getPackedOrdersByWarehouse(selectedWarehouse);
    setPackedOrders(orders);

    if (packingId) {
      const target = orders.find((o) => o.id === packingId);
      if (target) {
        setSelectedOrderIds(new Set([target.id]));
        const newQtyMap: Record<string, number> = {};
        const newSelections: Record<string, Record<string, number>> = {};
        const warehouse = target.warehouse || target.sourceWarehouse || selectedWarehouse;
        target.products.forEach((p) => {
          const key = rowKey(target.id, p.sku);
          newQtyMap[key] = p.packedQty;
          newSelections[key] = selectionsFromPackingBatches(
            p.product,
            warehouse === "All" ? "Central Warehouse" : warehouse,
            p.packedQty,
            p.batchAllocations ?? [],
          );
        });
        setDispatchQtyMap(newQtyMap);
        setBatchSelections(newSelections);
      }
    } else {
      setSelectedOrderIds(new Set());
      setDispatchQtyMap({});
      setBatchSelections({});
    }
  }, [selectedWarehouse, packingId]);

  const toggleOrderSelection = (order: PackingRecord) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      const warehouse = order.warehouse || order.sourceWarehouse || selectedWarehouse;
      const resolvedWarehouse = warehouse === "All" ? "Central Warehouse" : warehouse;

      if (next.has(order.id)) {
        next.delete(order.id);
        const newQtyMap = { ...dispatchQtyMap };
        const newSelections = { ...batchSelections };
        order.products.forEach((p) => {
          const key = rowKey(order.id, p.sku);
          delete newQtyMap[key];
          delete newSelections[key];
        });
        setDispatchQtyMap(newQtyMap);
        setBatchSelections(newSelections);
      } else {
        next.add(order.id);
        const newQtyMap = { ...dispatchQtyMap };
        const newSelections = { ...batchSelections };
        order.products.forEach((p) => {
          const key = rowKey(order.id, p.sku);
          newQtyMap[key] = p.packedQty;
          newSelections[key] = selectionsFromPackingBatches(
            p.product,
            resolvedWarehouse,
            p.packedQty,
            p.batchAllocations ?? [],
          );
        });
        setDispatchQtyMap(newQtyMap);
        setBatchSelections(newSelections);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => packedOrders.filter((o) => selectedOrderIds.has(o.id)),
    [packedOrders, selectedOrderIds],
  );

  const productRows = useMemo(() => {
    const rows: {
      orderId: string;
      packingNo: string;
      product: string;
      sku: string;
      packedQty: number;
      customerName: string;
      warehouse: string;
    }[] = [];
    selectedOrders.forEach((order) => {
      const customerName =
        order.sourceDocumentType === "Stock Transfer"
          ? order.targetWarehouse || order.customer.replace("Transfer to ", "")
          : order.customer;
      const warehouse = order.warehouse || order.sourceWarehouse || selectedWarehouse;
      order.products.forEach((p) => {
        rows.push({
          orderId: order.id,
          packingNo: order.packingNo,
          product: p.product,
          sku: p.sku,
          packedQty: p.packedQty,
          customerName,
          warehouse: warehouse === "All" ? "Central Warehouse" : warehouse,
        });
      });
    });
    return rows;
  }, [selectedOrders, selectedWarehouse]);

  const dispatchContextRows = useMemo(() => {
    return productRows
      .map((row) => {
        const key = rowKey(row.orderId, row.sku);
        const dispatchQty = dispatchQtyMap[key] ?? row.packedQty;
        const batchAllocations = batchSelectionsToAllocations(
          row.product,
          row.warehouse,
          batchSelections[key] ?? {},
        );
        return { ...row, key, dispatchQty, batchAllocations };
      })
      .filter((row) => row.dispatchQty > 0);
  }, [productRows, dispatchQtyMap, batchSelections]);

  const nearExpirySchemeEntries = useMemo(() => {
    const entries: ReturnType<typeof buildDispatchNearExpiryEntries> = [];
    dispatchContextRows.forEach((row) => {
      if (!row.batchAllocations.length) return;
      entries.push(
        ...buildDispatchNearExpiryEntries({
          productName: row.product,
          sku: row.sku,
          warehouse: row.warehouse,
          customerName: row.customerName,
          quantity: row.dispatchQty,
          batchAllocations: row.batchAllocations,
        }),
      );
    });
    return entries;
  }, [dispatchContextRows]);

  const batchAllocationErrors = dispatchContextRows.some((row) => {
    const selected = Object.values(batchSelections[row.key] ?? {}).reduce((sum, n) => sum + n, 0);
    return selected !== row.dispatchQty;
  });

  const handleQtyChange = (
    key: string,
    val: string,
    maxPacked: number,
    productName: string,
    warehouse: string,
    packingBatches: { batchNumber: string; allocatedQty: number }[],
  ) => {
    const num = parseInt(val, 10);
    const qty = Number.isNaN(num) ? 0 : num;
    setDispatchQtyMap((prev) => ({ ...prev, [key]: qty }));
    setBatchSelections((prev) => ({
      ...prev,
      [key]: selectionsFromPackingBatches(
        productName,
        warehouse,
        qty,
        packingBatches.map((b) => ({ ...b, expiryDate: "" })),
      ),
    }));

    let err = "";
    if (qty < 0) err = "Cannot be negative";
    else if (qty > maxPacked) err = `Cannot exceed packed qty of ${maxPacked}`;
    setValidationErrors((prev) => ({ ...prev, [key]: err }));
  };

  const isStockTransfer = useMemo(
    () => selectedOrders.some((o) => o.sourceDocumentType === "Stock Transfer" || o.id.startsWith("st-")),
    [selectedOrders],
  );

  const hasErrors = Object.values(validationErrors).some((e) => e !== "");
  const totalDispatchQty = Object.values(dispatchQtyMap).reduce((a, b) => a + b, 0);
  const isNearExpiryDemo =
    selectedOrders.some((o) => o.id === "pk-ne-demo") || packingId === "pk-ne-demo";

  const handleSubmit = (isDraft: boolean) => {
    if (hasErrors || batchAllocationErrors || (!isDraft && totalDispatchQty <= 0)) {
      alert("Please fix errors, match batch selections, and dispatch at least 1 item.");
      return;
    }

    const schemeEntriesByRowKey: Record<string, typeof nearExpirySchemeEntries> = {};
    dispatchContextRows.forEach((row) => {
      const rowEntries = nearExpirySchemeEntries.filter(
        (entry) => entry.sku === row.sku && entry.product === row.product,
      );
      if (rowEntries.length) schemeEntriesByRowKey[row.key] = rowEntries;
    });

    const dispatchProducts: DispatchProduct[] = dispatchContextRows.map((row) => {
      const primaryBatch = row.batchAllocations[0];
      const schemeEntries = schemeEntriesByRowKey[row.key] ?? [];
      return {
        product: row.product,
        sku: row.sku,
        packedQty: row.packedQty,
        dispatchQty: row.dispatchQty,
        batchNo: primaryBatch?.batchNumber,
        batchExpiryDate: primaryBatch?.expiryDate,
        batchAllocations: row.batchAllocations,
        nearExpirySchemeEligible: schemeEntries.length > 0,
      };
    });

    const isSampleOrder = selectedOrders.some(
      (o) =>
        o.sourceDocumentType === "Sample Order" ||
        o.salesOrderNo.startsWith("SM-") ||
        o.salesOrderNo.startsWith("SMP-"),
    );
    const docType = isStockTransfer ? "Stock Transfer" : isSampleOrder ? "Sample Order" : "Sales Order";
    const sourceType = isStockTransfer ? "stock_transfer" : isSampleOrder ? "sample_order" : "sales_order";

    const record: DispatchRecord = {
      id: `dp-${Date.now()}`,
      dispatchNumber: packingNo,
      salesOrderNumber: selectedOrders.map((o) => o.salesOrderNo).join(", "),
      customer: isStockTransfer
        ? selectedOrders
            .map((o) => o.targetWarehouse || o.customer.replace("Transfer to ", ""))
            .join(", ")
        : selectedOrders.map((o) => o.customer).join(", "),
      vehicleNumber,
      driverName,
      transporterName,
      dispatchDate,
      deliveryStatus: isDraft ? "Pending Dispatch" : (deliveryStatus as DispatchRecord["deliveryStatus"]),
      warehouse: selectedWarehouse === "All" ? "Central Warehouse" : selectedWarehouse,
      products: dispatchProducts,
      packingNumbers: selectedOrders.map((o) => o.packingNo),
      nearExpirySchemes: nearExpirySchemeEntries.length ? nearExpirySchemeEntries : undefined,
      sourceDocumentType: docType,
      sourceWarehouse: selectedOrders.map((o) => o.sourceWarehouse || o.warehouse).join(", "),
      targetWarehouse: isStockTransfer
        ? selectedOrders.map((o) => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ")
        : undefined,
      dispatch_id: `dp-${Date.now()}`,
      dispatch_no: packingNo,
      source_type: sourceType,
      source_document_no: selectedOrders.map((o) => o.salesOrderNo).join(", "),
      dispatch_date: dispatchDate,
      customer_name: isStockTransfer ? "" : selectedOrders.map((o) => o.customer).join(", "),
      source_warehouse_name: selectedOrders.map((o) => o.sourceWarehouse || o.warehouse).join(", "),
      target_warehouse_name: isStockTransfer
        ? selectedOrders.map((o) => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ")
        : "",
      total_items: dispatchProducts.length,
      total_quantity: dispatchProducts.reduce((acc, p) => acc + p.dispatchQty, 0),
      dispatch_status: isDraft ? "Pending Dispatch" : deliveryStatus,
    };

    saveDispatch(record);
    router.push("/warehouse/dispatch");
  };

  return (
    <FormContainer
      title="Create Dispatch"
      description="Record a new outbound shipment dispatch session"
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={hasErrors || batchAllocationErrors || totalDispatchQty <= 0 || !vehicleNumber || !driverName}
            onClick={() => handleSubmit(false)}
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" /> Dispatch
          </Button>
        </div>
      }
      noCard={false}
    >
      <div className="space-y-6">
        {isNearExpiryDemo && (
          <div className="rounded-lg border border-orange-200 bg-orange-50/50 px-3 py-2.5">
            <p className="text-xs font-bold text-orange-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Near Expiry Demo — Packed Order PKG-2026-NE-DEMO
            </p>
            <p className="mt-1 text-[11px] text-orange-800">
              Batch <strong>B001</strong> for <strong>Bio Fertilizer A</strong> is pre-allocated. Adjust
              dispatch qty or batch selection to verify scheme badge and settlement details.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-brand-600" /> Dispatch Header Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Number</p>
              <Input value={packingNo} disabled className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5" />
            </div>
            {selectedOrders.length > 0 && (
              <>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {isStockTransfer ? "Stock Transfer No" : "Sales Order No"}
                  </p>
                  <Input
                    value={selectedOrders.map((o) => o.salesOrderNo).join(", ")}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-mono mt-1.5"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {isStockTransfer ? "Target Warehouse" : "Customer"}
                  </p>
                  <Input
                    value={
                      isStockTransfer
                        ? selectedOrders
                            .map((o) => o.targetWarehouse || o.customer.replace("Transfer to ", ""))
                            .join(", ")
                        : selectedOrders.map((o) => o.customer).join(", ")
                    }
                    disabled
                    className="h-8 text-xs bg-slate-50 mt-1.5"
                  />
                </div>
              </>
            )}
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
              <AutocompleteSelect
                options={[{ value: "All", label: "All Warehouses" }, ...WAREHOUSE_OPTIONS]}
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                placeholder="Select warehouse"
                searchPlaceholder="Search warehouse..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Date *</p>
              <Input
                type="date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                className="h-8 text-xs mt-1.5"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Vehicle Number *</p>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="h-8 text-xs mt-1.5"
                placeholder="e.g. MH-12-AB-1234"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Driver Name *</p>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="h-8 text-xs mt-1.5"
                placeholder="Enter driver name"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Transporter Name</p>
              <Input
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
                className="h-8 text-xs mt-1.5"
                placeholder="Enter transporter"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Delivery Status</p>
              <AutocompleteSelect
                options={DELIVERY_STATUS_OPTIONS}
                value={deliveryStatus}
                onChange={setDeliveryStatus}
                placeholder="Select status"
                searchPlaceholder="Search status..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-brand-600" /> Select Packed Orders
          </h2>
          {packedOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No packed orders available for the selected warehouse.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-10">Select</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Packing No</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sales Order / ST No</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer / Target Warehouse</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Total Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {packedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className={`border-b border-border/60 hover:bg-slate-50/40 cursor-pointer ${
                        selectedOrderIds.has(order.id) ? "bg-brand-50/40" : ""
                      } ${order.id === "pk-ne-demo" ? "ring-1 ring-inset ring-orange-200" : ""}`}
                      onClick={() => toggleOrderSelection(order)}
                    >
                      <td className="py-3 px-3">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            selectedOrderIds.has(order.id) ? "bg-brand-600 border-brand-600" : "border-muted-foreground/30"
                          }`}
                        >
                          {selectedOrderIds.has(order.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">
                        {order.packingNo}
                        {order.id === "pk-ne-demo" && (
                          <span className="ml-1.5 text-[10px] font-bold text-orange-700">NE Demo</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono font-bold text-slate-600">{order.salesOrderNo}</td>
                      <td className="py-3 px-3 text-xs font-bold">
                        {order.sourceDocumentType === "Stock Transfer"
                          ? order.targetWarehouse || order.customer.replace("Transfer to ", "")
                          : order.customer}
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-center">{order.packedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {productRows.length > 0 && (
          <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-brand-600" /> Product Dispatch Grid
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Packing No</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[160px]">Dispatch Qty *</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row) => {
                    const key = rowKey(row.orderId, row.sku);
                    const currentQty = dispatchQtyMap[key] ?? row.packedQty;
                    const err = validationErrors[key];
                    const packingOrder = selectedOrders.find((o) => o.id === row.orderId);
                    const packedProduct = packingOrder?.products.find((p) => p.sku === row.sku);
                    const packingBatches = (packedProduct?.batchAllocations ?? []).map((b) => ({
                      batchNumber: b.batchNumber,
                      allocatedQty: b.allocatedQty,
                    }));

                    return (
                      <tr key={key} className="border-b border-border/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold">{row.product}</td>
                        <td className="py-3 px-3 text-xs font-mono text-muted-foreground">{row.packingNo}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{row.sku}</td>
                        <td className="py-3 px-3 text-xs font-bold text-center">{row.packedQty}</td>
                        <td className="py-2 px-3">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={currentQty}
                              onChange={(e) =>
                                handleQtyChange(
                                  key,
                                  e.target.value,
                                  row.packedQty,
                                  row.product,
                                  row.warehouse,
                                  packingBatches,
                                )
                              }
                              className={`h-8 text-xs font-bold text-right px-3 ${
                                err ? "border-red-400 focus:ring-red-500" : ""
                              }`}
                            />
                            {err && <p className="text-[10px] text-red-500 font-semibold">{err}</p>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {dispatchContextRows.length > 0 && (
          <div className="border-t border-border/80 pt-6 mt-6 space-y-3">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2">
              Batch Allocation by Product
            </h2>
            {dispatchContextRows.map((row) => (
              <BatchAllocationSection
                key={row.key}
                productName={row.product}
                sku={row.sku}
                requiredQty={row.dispatchQty}
                warehouse={row.warehouse}
                customerName={row.customerName}
                selections={batchSelections[row.key] ?? {}}
                onSelectionsChange={(next) =>
                  setBatchSelections((prev) => ({ ...prev, [row.key]: next }))
                }
                qtyLabel="Dispatch Qty"
              />
            ))}
          </div>
        )}

        {nearExpirySchemeEntries.length > 0 && (
          <NearExpirySchemeInfoPanel entries={nearExpirySchemeEntries} />
        )}
      </div>
    </FormContainer>
  );
}
