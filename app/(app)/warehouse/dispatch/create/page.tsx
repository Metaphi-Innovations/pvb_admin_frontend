"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Truck, Building, Package, CheckSquare, Check, Sparkles, User, Phone, Mail, MapPin } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPackedOrdersByWarehouse, saveDispatch, generateDispatchNumber } from "../services";
import { getPackingRecordById } from "../../packing/services";
import { PackingRecord } from "../../packing/types";
import { DispatchProduct, DispatchRecord } from "../types";
import { buildDispatchNearExpiryEntries } from "../near-expiry-dispatch";
import { NearExpirySchemeInfoPanel } from "../components/NearExpirySchemeInfoPanel";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";

export default function CreateDispatchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packingId = searchParams ? searchParams.get("packingId") : null;

  const [packingNo, setPackingNo] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transporterName, setTransporterName] = useState("");
  
  const [selectedSalesOrderNo, setSelectedSalesOrderNo] = useState("All");
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // We fetch all packings globally here so we can build a list of unique Sales Orders
  const allPackings = useMemo(() => getPackedOrdersByWarehouse("All"), []);

  const uniqueSalesOrders = useMemo(() => {
    const map = new Map<string, { label: string; warehouse: string; customer: string }>();
    allPackings.forEach(p => {
      if (!map.has(p.salesOrderNo)) {
        const customer = p.sourceDocumentType === "Stock Transfer"
            ? p.targetWarehouse || p.customer.replace("Transfer to ", "")
            : p.customer;
        map.set(p.salesOrderNo, {
          label: p.salesOrderNo,
          warehouse: p.warehouse || p.sourceWarehouse || "Central Warehouse",
          customer: customer,
        });
      }
    });
    return Array.from(map.entries()).map(([value, data]) => ({
      value,
      label: `${value} (${data.customer})`,
      warehouse: data.warehouse,
      customer: data.customer
    }));
  }, [allPackings]);

  useEffect(() => {
    setPackingNo(generateDispatchNumber());
  }, []);

  useEffect(() => {
    if (packingId) {
      const record = getPackingRecordById(packingId);
      if (record) {
        setSelectedSalesOrderNo(record.salesOrderNo);
      }
    }
  }, [packingId]);

  const selectedSOData = uniqueSalesOrders.find(so => so.value === selectedSalesOrderNo);
  const autoWarehouse = selectedSOData?.warehouse || "";
  const customerNameStr = selectedSOData?.customer || "";

  const packedOrders = useMemo(() => {
    if (selectedSalesOrderNo === "All") return [];
    return allPackings.filter(p => p.salesOrderNo === selectedSalesOrderNo);
  }, [selectedSalesOrderNo, allPackings]);

  // Auto-select packings when changing SO
  useEffect(() => {
    if (selectedSalesOrderNo !== "All") {
      setSelectedOrderIds(new Set(packedOrders.map(p => p.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  }, [selectedSalesOrderNo, packedOrders]);

  const customerDetails = useMemo(() => {
    const customers = loadCustomers();
    const found = customers.find(c => c.customerName.trim().toLowerCase() === customerNameStr.trim().toLowerCase());
    if (found) return found;

    // Fallback for mock data names not in customer-data.ts
    return {
      mobile: "9876543210",
      email: "contact@" + customerNameStr.replace(/[^a-zA-Z]/g, "").toLowerCase() + ".com",
      address: "123 Business Park",
      districtName: "Pune Region",
      stateName: "Maharashtra",
      pincode: "411001",
    };
  }, [customerNameStr]);

  const toggleOrderSelection = (order: PackingRecord) => {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
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
      batchAllocations: { batchNumber: string; expiryDate: string; allocatedQty: number }[];
    }[] = [];
    selectedOrders.forEach((order) => {
      const customerName =
        order.sourceDocumentType === "Stock Transfer"
          ? order.targetWarehouse || order.customer.replace("Transfer to ", "")
          : order.customer;
      const warehouse = order.warehouse || order.sourceWarehouse || autoWarehouse;
      order.products.forEach((p) => {
        rows.push({
          orderId: order.id,
          packingNo: order.packingNo,
          product: p.product,
          sku: p.sku,
          packedQty: p.packedQty,
          customerName,
          warehouse: warehouse === "All" ? "Central Warehouse" : warehouse,
          batchAllocations: p.batchAllocations ?? [],
        });
      });
    });
    return rows;
  }, [selectedOrders, autoWarehouse]);

  const nearExpirySchemeEntries = useMemo(() => {
    const entries: ReturnType<typeof buildDispatchNearExpiryEntries> = [];
    productRows.forEach((row) => {
      if (!row.batchAllocations.length) return;
      entries.push(
        ...buildDispatchNearExpiryEntries({
          productName: row.product,
          sku: row.sku,
          warehouse: row.warehouse,
          customerName: row.customerName,
          quantity: row.packedQty,
          batchAllocations: row.batchAllocations,
        }),
      );
    });
    return entries;
  }, [productRows]);

  const isStockTransfer = useMemo(
    () => selectedOrders.some((o) => o.sourceDocumentType === "Stock Transfer" || o.id.startsWith("st-")),
    [selectedOrders],
  );

  const totalDispatchQty = productRows.reduce((a, b) => a + b.packedQty, 0);
  const isNearExpiryDemo =
    selectedOrders.some((o) => o.id === "pk-ne-demo") || packingId === "pk-ne-demo";

  const handleSubmit = (isDraft: boolean) => {
    if ((!isDraft && totalDispatchQty <= 0)) {
      alert("Please select at least 1 packed order to dispatch.");
      return;
    }

    const schemeEntriesBySKU: Record<string, typeof nearExpirySchemeEntries> = {};
    productRows.forEach((row) => {
      const rowEntries = nearExpirySchemeEntries.filter(
        (entry) => entry.sku === row.sku && entry.product === row.product,
      );
      if (rowEntries.length) schemeEntriesBySKU[`${row.orderId}::${row.sku}`] = rowEntries;
    });

    const dispatchProducts: DispatchProduct[] = productRows.map((row) => {
      const primaryBatch = row.batchAllocations[0];
      const schemeEntries = schemeEntriesBySKU[`${row.orderId}::${row.sku}`] ?? [];
      return {
        product: row.product,
        sku: row.sku,
        packedQty: row.packedQty,
        dispatchQty: row.packedQty, // 100% of packed quantity goes directly to dispatch
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
      deliveryStatus: isDraft ? "Pending Dispatch" : "Pending Dispatch",
      warehouse: autoWarehouse,
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
      dispatch_status: "Pending Dispatch",
    };

    saveDispatch(record);
    router.push("/warehouse/dispatch");
  };

  return (
    <FormContainer
      title="Create Dispatch"
      description="Record a new outbound shipment dispatch session from packed orders"
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={totalDispatchQty <= 0 || !vehicleNumber || !driverName}
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
            
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Order / Stock Transfer</p>
              <AutocompleteSelect
                options={[{ value: "All", label: "Select Sales Order..." }, ...uniqueSalesOrders]}
                value={selectedSalesOrderNo}
                onChange={setSelectedSalesOrderNo}
                placeholder="Select Sales Order"
                searchPlaceholder="Search order..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse (Auto-filled)</p>
              <Input 
                value={autoWarehouse || "—"} 
                disabled 
                className="h-8 text-xs bg-slate-50 font-semibold mt-1.5" 
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
          </div>
        </div>

        {/* Dynamic Customer / Destination Details */}
        {selectedSalesOrderNo !== "All" && (
          <div className="rounded-xl border border-border bg-slate-50/50 overflow-hidden mt-6">
            <div className="bg-slate-100/80 border-b border-border px-4 py-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-brand-600" />
                {isStockTransfer ? "Destination Details" : "Customer Details"}
              </h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {isStockTransfer ? "Target Warehouse" : "Name"}
                </p>
                <p className="text-sm font-bold text-foreground">
                  {customerNameStr || "—"}
                </p>
              </div>
              
              {!isStockTransfer && (
                <>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Contact
                    </p>
                    <div className="flex flex-col gap-1 text-xs text-slate-700">
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" /> {customerDetails?.mobile || "—"}</span>
                      <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" /> {customerDetails?.email || "—"}</span>
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Address
                    </p>
                    <div className="flex items-start gap-1.5 text-xs text-slate-700">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {customerDetails?.address ? (
                          <>{customerDetails.address}, {customerDetails.districtName}, {customerDetails.stateName} - {customerDetails.pincode}</>
                        ) : "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-brand-600" /> Select Packed Orders
          </h2>
          {selectedSalesOrderNo === "All" ? (
             <p className="text-xs text-muted-foreground py-4 text-center">
              Please select a Sales Order from above to view available packings.
             </p>
          ) : packedOrders.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No packed orders available for this Sales Order.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider w-10">Select</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Packing No</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date Packed</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Total Items</th>
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
                      <td className="py-3 px-3 text-xs font-medium text-slate-600">{order.packingDate}</td>
                      <td className="py-3 px-3 text-xs font-bold text-center">{order.totalItems}</td>
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
              <Package className="w-4 h-4 text-brand-600" /> Read-Only Dispatch Product Details
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-slate-50/80">
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Packing No</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batch Allocation</th>
                    <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Dispatch Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {productRows.map((row) => {
                    const key = `${row.orderId}::${row.sku}`;
                    return (
                      <tr key={key} className="hover:bg-slate-50/40">
                        <td className="py-3 px-3 text-xs font-bold">{row.product}</td>
                        <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{row.sku}</td>
                        <td className="py-3 px-3 text-xs font-mono text-muted-foreground">{row.packingNo}</td>
                        <td className="py-2 px-3">
                          {row.batchAllocations.length === 0 ? (
                            <span className="text-xs text-muted-foreground italic">No batch</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {row.batchAllocations.map(b => (
                                <div key={b.batchNumber} className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono font-semibold border border-slate-200">
                                    {b.batchNumber}
                                  </span>
                                  <span className="text-xs text-slate-600 font-medium">Qty: {b.allocatedQty}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-xs font-bold text-right text-brand-700">{row.packedQty}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50">
                    <td colSpan={4} className="py-3 px-4 text-xs font-bold text-right uppercase tracking-wider text-slate-500">
                      Total Dispatch Quantity
                    </td>
                    <td className="py-3 px-3 text-sm font-bold text-right text-brand-700">
                      {totalDispatchQty}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {nearExpirySchemeEntries.length > 0 && (
          <NearExpirySchemeInfoPanel entries={nearExpirySchemeEntries} />
        )}
      </div>
    </FormContainer>
  );
}
