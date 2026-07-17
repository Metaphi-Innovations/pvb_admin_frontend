"use client";

import React, { useEffect, useState, useMemo, Fragment } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Truck, CheckSquare, Check, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getPreviewNumber, getPackingDoneList, createDispatch, getPackingDoneById } from "../services";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invalidatePurchaseOrderModuleListingQueries } from "@/lib/procurement/invalidate-po-listing-queries";

export default function CreateDispatchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const packingIdFromUrl = searchParams ? searchParams.get("packingId") : null;
  const sourceTypeFromUrl = searchParams ? searchParams.get("sourceType") : null;

  const [sourceType, setSourceType] = useState<string>(sourceTypeFromUrl || "sales_order");

  const [dispatchNumber, setDispatchNumber] = useState("");
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");

  const [availablePackings, setAvailablePackings] = useState<any[]>([]);
  const [selectedPackingId, setSelectedPackingId] = useState<string>("");
  const [packingDetails, setPackingDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPreviewNumber().then((num) => setDispatchNumber(num)).catch(console.error);

    // Fetch available packing done records (assume status=Ready For Dispatch implies ready for dispatch)
    const mappedSourceType = sourceType === "sales_order" ? "normal_sales" : sourceType;
    getPackingDoneList({ filters: { status: "Ready For Dispatch", source_type: mappedSourceType }, page: 1, page_size: 100 })
      .then((res) => {
        const items = res?.data?.items || res?.data || [];
        setAvailablePackings(items);
        if (packingIdFromUrl && items.some((p: any) => p.packing_done_id === packingIdFromUrl)) {
          setSelectedPackingId(packingIdFromUrl);
        } else {
          setSelectedPackingId(""); // reset if type changes
        }
      })
      .catch(console.error);
  }, [packingIdFromUrl, sourceType]);

  useEffect(() => {
    if (!selectedPackingId) {
      setPackingDetails(null);
      return;
    }
    getPackingDoneById(selectedPackingId)
      .then((data) => setPackingDetails(data))
      .catch(console.error);
  }, [selectedPackingId]);

  const selectedPacking = useMemo(() => {
    return availablePackings.find((p) => p.packing_done_id === selectedPackingId);
  }, [availablePackings, selectedPackingId]);

  const handleSubmit = async () => {
    if (!selectedPackingId) {
      alert("Please select a Packing record to dispatch.");
      return;
    }
    if (!vehicleNumber.trim()) {
      alert("Vehicle Number is required.");
      return;
    }
    if (!driverName.trim()) {
      alert("Driver Name is required.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        packing_done_id: selectedPackingId,
        warehouse_id: selectedPacking?.warehouse_id || selectedPacking?.source_warehouse_id || selectedPacking?.warehouse?.id || selectedPacking?.source_warehouse?.id,
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        transporter: transporterName || null,
        dispatch_date: dispatchDate ? new Date(dispatchDate).toISOString() : undefined,
        lr_number: lrNumber || null,
        eway_bill_number: ewayBillNumber || null,
      };

      await createDispatch(payload);
      await invalidatePurchaseOrderModuleListingQueries(queryClient);
      alert("Dispatch created successfully");
      router.push("/warehouse/dispatch");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to create Dispatch");
    } finally {
      setLoading(false);
    }
  };

  const packingOptions = availablePackings.map((p) => ({
    value: p.packing_done_id,
    label: `${p.packing_done_no} - ${p.customer_name || p.source_type} (Qty: ${p.total_packed_qty})`
  }));

  const groupedPackingProducts = useMemo(() => {
    if (!packingDetails?.products) return [];
    const map = new Map<string, any>();
    packingDetails.products.forEach((item: any) => {
      const pId = item.product_id;
      if (!map.has(pId)) {
        map.set(pId, {
          product_id: pId,
          product_name: item.product_name || item.product_id,
          unit_price: item.unit_price || 0,
          total_order_qty: 0,
          total_packed_qty: 0,
          total_discount: 0,
          total_gst: 0,
          total_amount: 0,
          batches: []
        });
      }
      const group = map.get(pId);
      group.total_order_qty = Math.max(group.total_order_qty, Number(item.order_qty || 0));
      group.total_packed_qty += Number(item.packed_qty || 0);
      group.total_discount += Number(item.discount_amount || 0);
      group.total_gst += Number(item.gst_amount || 0);
      group.total_amount += Number(item.item_total || 0);
      
      const batchCode = item.batch_code || "Unknown";
      const existingBatch = group.batches.find((b: any) => b.batch_code === batchCode);
      if (existingBatch) {
        existingBatch.qty += Number(item.packed_qty || 0);
      } else {
        group.batches.push({
          id: item.packing_done_product_id,
          batch_code: batchCode,
          qty: Number(item.packed_qty || 0),
          remarks: item.remarks
        });
      }
    });
    return Array.from(map.values());
  }, [packingDetails]);

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
            disabled={!selectedPackingId || !vehicleNumber || !driverName || loading}
            onClick={handleSubmit}
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          >
            <Truck className="w-3.5 h-3.5" /> {loading ? "Dispatching..." : "Dispatch"}
          </Button>
        </div>
      }
      noCard={false}
    >
      <Tabs value={sourceType} onValueChange={setSourceType} className="mb-6 w-full">
        <TabsList>
          <TabsTrigger value="sales_order" className="text-xs">Normal Sales</TabsTrigger>
          <TabsTrigger value="sample" className="text-xs">Sample</TabsTrigger>
          <TabsTrigger value="stock_transfer" className="text-xs">Stock Transfer</TabsTrigger>
          <TabsTrigger value="purchase_return" className="text-xs">Purchase Return</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-brand-600" /> Dispatch Header Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Number</p>
              <Input value={dispatchNumber} disabled className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5" />
            </div>

            <div className="md:col-span-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                Select Packing List *
              </p>
              <AutocompleteSelect
                options={packingOptions}
                value={selectedPackingId}
                onChange={setSelectedPackingId}
                placeholder="Search and select Packing List to Dispatch..."
                searchPlaceholder="Search packing list..."
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
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">LR Number</p>
              <Input
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
                className="h-8 text-xs mt-1.5"
                placeholder="Enter LR number"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">E-Way Bill Number</p>
              <Input
                value={ewayBillNumber}
                onChange={(e) => setEwayBillNumber(e.target.value)}
                className="h-8 text-xs mt-1.5"
                placeholder="Enter E-Way bill"
              />
            </div>
          </div>
        </div>

        {selectedPacking && (
          <div className="border-t border-border/80 pt-6 mt-6 space-y-6">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-brand-600" /> Selected Packing Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-border">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Packing No</p>
                <p className="text-sm font-bold text-foreground font-mono">{selectedPacking.packing_done_no}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer / Destination</p>
                <p className="text-sm font-bold text-foreground">{selectedPacking.customer_name || selectedPacking.target_warehouse_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Items</p>
                <p className="text-sm font-bold text-foreground">{selectedPacking.total_items}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Quantity</p>
                <p className="text-sm font-bold text-foreground">{selectedPacking.total_packed_qty}</p>
              </div>
            </div>

            {packingDetails && packingDetails.customer_snapshot && packingDetails.source_type !== "stock_transfer" && (
              <div className="bg-slate-50 p-4 rounded-lg border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shipping Address</p>
                <div className="text-xs text-foreground space-y-1">
                  <p className="font-semibold">{packingDetails.customer_snapshot.customer_name}</p>
                  <p>{packingDetails.customer_snapshot.shipping_address || packingDetails.customer_snapshot.billing_address || "No address provided."}</p>
                  {packingDetails.customer_snapshot.city && <p>{packingDetails.customer_snapshot.city}, {packingDetails.customer_snapshot.state} {packingDetails.customer_snapshot.pincode}</p>}
                </div>
              </div>
            )}

            {packingDetails && packingDetails.target_warehouse_name && packingDetails.source_type === "stock_transfer" && (
              <div className="bg-slate-50 p-4 rounded-lg border border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Destination Warehouse</p>
                <div className="text-xs text-foreground space-y-1">
                  <p className="font-semibold">{packingDetails.target_warehouse_name}</p>
                </div>
              </div>
            )}

            {packingDetails && packingDetails.products && packingDetails.products.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Packed Products</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Product</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Order Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Packed Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Unit Price</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Discount</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">GST</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Total</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {groupedPackingProducts.map((group: any) => (
                        <Fragment key={group.product_id}>
                          <tr className="bg-slate-50/50">
                            <td className="px-3 py-2 font-medium">{group.product_name}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-medium">{group.total_order_qty}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-bold">{group.total_packed_qty}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.unit_price).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.total_discount).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.total_gst).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-bold">₹{Number(group.total_amount).toFixed(2)}</td>
                            <td className="px-3 py-2"></td>
                          </tr>
                          {group.batches.map((b: any) => (
                            <tr key={b.id} className="text-muted-foreground bg-white">
                              <td colSpan={2} className="px-3 py-1.5 pl-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                Batch: <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{b.batch_code}</span>
                              </td>
                              <td className="px-3 py-1.5 tabular-nums text-right font-mono">{b.qty}</td>
                              <td colSpan={4}></td>
                              <td className="px-3 py-1.5">{b.remarks || "—"}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </FormContainer>
  );
}
