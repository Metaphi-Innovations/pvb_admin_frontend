"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ArrowLeft, Truck, Building, Package, CheckSquare, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPackedOrdersByWarehouse, saveDispatch, generateDispatchNumber } from "../services";
import { getPackingRecordById } from "../../packing/services";
import { PackingRecord } from "../../packing/types";
import { DispatchProduct, DispatchRecord } from "../types";
import { WAREHOUSE_OPTIONS, DELIVERY_STATUS_OPTIONS } from "../constants";

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
      const target = orders.find(o => o.id === packingId);
      if (target) {
        setSelectedOrderIds(new Set([target.id]));
        const newQtyMap: Record<string, number> = {};
        target.products.forEach(p => {
          newQtyMap[`${target.id}::${p.sku}`] = p.packedQty;
        });
        setDispatchQtyMap(newQtyMap);
      }
    } else {
      setSelectedOrderIds(new Set());
      setDispatchQtyMap({});
    }
  }, [selectedWarehouse, packingId]);

  const toggleOrderSelection = (order: PackingRecord) => {
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(order.id)) {
        next.delete(order.id);
        // Remove quantities for this order's products
        const newQtyMap = { ...dispatchQtyMap };
        order.products.forEach(p => delete newQtyMap[`${order.id}::${p.sku}`]);
        setDispatchQtyMap(newQtyMap);
      } else {
        next.add(order.id);
        // Initialize dispatch quantities to full packed qty
        const newQtyMap = { ...dispatchQtyMap };
        order.products.forEach(p => { newQtyMap[`${order.id}::${p.sku}`] = p.packedQty; });
        setDispatchQtyMap(newQtyMap);
      }
      return next;
    });
  };

  const selectedOrders = useMemo(
    () => packedOrders.filter(o => selectedOrderIds.has(o.id)),
    [packedOrders, selectedOrderIds]
  );

  // Build flat product rows from selected orders for the dispatch grid
  const productRows = useMemo(() => {
    const rows: { orderId: string; packingNo: string; product: string; sku: string; packedQty: number }[] = [];
    selectedOrders.forEach(order => {
      order.products.forEach(p => {
        rows.push({ orderId: order.id, packingNo: order.packingNo, product: p.product, sku: p.sku, packedQty: p.packedQty });
      });
    });
    return rows;
  }, [selectedOrders]);

  const handleQtyChange = (key: string, val: string, maxPacked: number) => {
    const num = parseInt(val, 10);
    const qty = isNaN(num) ? 0 : num;
    setDispatchQtyMap(prev => ({ ...prev, [key]: qty }));

    let err = "";
    if (qty < 0) err = "Cannot be negative";
    else if (qty > maxPacked) err = `Cannot exceed packed qty of ${maxPacked}`;
    setValidationErrors(prev => ({ ...prev, [key]: err }));
  };

  const isStockTransfer = useMemo(() => {
    return selectedOrders.some(o => o.sourceDocumentType === "Stock Transfer" || o.id.startsWith("st-"));
  }, [selectedOrders]);

  const hasErrors = Object.values(validationErrors).some(e => e !== "");
  const totalDispatchQty = Object.values(dispatchQtyMap).reduce((a, b) => a + b, 0);

  const handleSubmit = (isDraft: boolean) => {
    if (hasErrors || (!isDraft && totalDispatchQty <= 0)) {
      alert("Please fix errors or pack at least 1 item.");
      return;
    }

    const dispatchProducts: DispatchProduct[] = productRows.map(r => ({
      product: r.product,
      sku: r.sku,
      packedQty: r.packedQty,
      dispatchQty: dispatchQtyMap[`${r.orderId}::${r.sku}`] ?? r.packedQty,
    })).filter(p => p.dispatchQty > 0);

    const isSampleOrder = selectedOrders.some(o => o.sourceDocumentType === "Sample Order" || o.salesOrderNo.startsWith("SM-") || o.salesOrderNo.startsWith("SMP-"));
    const docType = isStockTransfer ? "Stock Transfer" : (isSampleOrder ? "Sample Order" : "Sales Order");
    const sourceType = isStockTransfer ? "stock_transfer" : (isSampleOrder ? "sample_order" : "sales_order");

    const record: DispatchRecord = {
      id: `dp-${Date.now()}`,
      dispatchNumber: packingNo,
      salesOrderNumber: selectedOrders.map(o => o.salesOrderNo).join(", "),
      customer: isStockTransfer 
        ? selectedOrders.map(o => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ")
        : selectedOrders.map(o => o.customer).join(", "),
      vehicleNumber,
      driverName,
      transporterName,
      dispatchDate,
      deliveryStatus: isDraft ? "Pending Dispatch" : (deliveryStatus as DispatchRecord["deliveryStatus"]),
      warehouse: selectedWarehouse === "All" ? "Central Warehouse" : selectedWarehouse,
      products: dispatchProducts,
      packingNumbers: selectedOrders.map(o => o.packingNo),
      sourceDocumentType: docType,
      sourceWarehouse: selectedOrders.map(o => o.sourceWarehouse || o.warehouse).join(", "),
      targetWarehouse: isStockTransfer ? selectedOrders.map(o => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ") : undefined,

      // Backend ready fields
      dispatch_id: `dp-${Date.now()}`,
      dispatch_no: packingNo,
      source_type: sourceType,
      source_document_no: selectedOrders.map(o => o.salesOrderNo).join(", "),
      dispatch_date: dispatchDate,
      customer_name: isStockTransfer ? "" : selectedOrders.map(o => o.customer).join(", "),
      source_warehouse_name: selectedOrders.map(o => o.sourceWarehouse || o.warehouse).join(", "),
      target_warehouse_name: isStockTransfer ? selectedOrders.map(o => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ") : "",
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
          <Button variant="outline" size="sm" className="h-9 text-xs font-semibold" onClick={() => handleSubmit(true)}>
            Save Draft
          </Button>
          <Button
            size="sm"
            disabled={hasErrors || totalDispatchQty <= 0 || !vehicleNumber || !driverName}
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
        {/* Header Details */}
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
                  <Input value={selectedOrders.map(o => o.salesOrderNo).join(", ")} disabled className="h-8 text-xs bg-slate-50 font-mono mt-1.5" />
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {isStockTransfer ? "Target Warehouse" : "Customer"}
                  </p>
                  <Input 
                    value={isStockTransfer 
                      ? selectedOrders.map(o => o.targetWarehouse || o.customer.replace("Transfer to ", "")).join(", ")
                      : selectedOrders.map(o => o.customer).join(", ")
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
                options={[
                  { value: "All", label: "All Warehouses" },
                  ...WAREHOUSE_OPTIONS
                ]}
                value={selectedWarehouse}
                onChange={setSelectedWarehouse}
                placeholder="Select warehouse"
                searchPlaceholder="Search warehouse..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Date *</p>
              <Input type="date" value={dispatchDate} onChange={e => setDispatchDate(e.target.value)} className="h-8 text-xs mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Vehicle Number *</p>
              <Input value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} className="h-8 text-xs mt-1.5" placeholder="e.g. MH-12-AB-1234" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Driver Name *</p>
              <Input value={driverName} onChange={e => setDriverName(e.target.value)} className="h-8 text-xs mt-1.5" placeholder="Enter driver name" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Transporter Name</p>
              <Input value={transporterName} onChange={e => setTransporterName(e.target.value)} className="h-8 text-xs mt-1.5" placeholder="Enter transporter" />
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

        {/* Select Packed Orders */}
        <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-brand-600" /> Select Packed Orders
          </h2>
          {packedOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No packed orders available for the selected warehouse.</p>
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
                  {packedOrders.map(order => (
                    <tr key={order.id} className={`border-b border-border/60 hover:bg-slate-50/40 cursor-pointer ${selectedOrderIds.has(order.id) ? "bg-brand-50/40" : ""}`} onClick={() => toggleOrderSelection(order)}>
                      <td className="py-3 px-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${selectedOrderIds.has(order.id) ? "bg-brand-600 border-brand-600" : "border-muted-foreground/30"}`}>
                           {selectedOrderIds.has(order.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{order.packingNo}</td>
                      <td className="py-3 px-3 text-xs font-mono font-bold text-slate-600">{order.salesOrderNo}</td>
                      <td className="py-3 px-3 text-xs font-bold">
                        {order.sourceDocumentType === "Stock Transfer" ? (order.targetWarehouse || order.customer.replace("Transfer to ", "")) : order.customer}
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-center">{order.packedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Product Dispatch Grid */}
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
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-[160px]">Dispatch Qty *</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map(row => {
                    const key = `${row.orderId}::${row.sku}`;
                    const currentQty = dispatchQtyMap[key] ?? row.packedQty;
                    const err = validationErrors[key];
                    return (
                      <tr key={key} className="border-b border-border/60 hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold">{row.product}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{row.sku}</td>
                        <td className="py-3 px-3 text-xs font-bold text-center">{row.packedQty}</td>
                        <td className="py-2 px-3">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              value={currentQty}
                              onChange={e => handleQtyChange(key, e.target.value, row.packedQty)}
                              className={`h-8 text-xs font-bold text-right px-3 ${err ? "border-red-400 focus:ring-red-500" : ""}`}
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
      </div>
    </FormContainer>
  );
}
