"use client";

import React, { useEffect, useState, useMemo, Fragment } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, CheckSquare } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getDispatchById, updateDispatch } from "../../services";

export default function EditDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dispatchNumber, setDispatchNumber] = useState("");
  
  const [dispatchDate, setDispatchDate] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [transporterName, setTransporterName] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [ewayBillNumber, setEwayBillNumber] = useState("");

  const [dispatchDetails, setDispatchDetails] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    setInitialLoading(true);
    getDispatchById(id)
      .then((data) => {
        setDispatchNumber(data.dispatch_no || data.dispatchNumber || data.dispatch_number || "");
        if (data.dispatch_date || data.dispatchDate) {
          setDispatchDate(new Date(data.dispatch_date || data.dispatchDate).toISOString().split("T")[0]);
        }
        setVehicleNumber(data.vehicleNumber || data.vehicle_number || "");
        setDriverName(data.driverName || data.driver_name || "");
        setTransporterName(data.transporter || "");
        setLrNumber(data.lrNumber || data.lr_number || "");
        setEwayBillNumber(data.ewayBillNumber || data.eway_bill_number || "");
        setDispatchDetails(data);
      })
      .catch(console.error)
      .finally(() => setInitialLoading(false));
  }, [id]);

  const handleSubmit = async () => {
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
        vehicle_number: vehicleNumber,
        driver_name: driverName,
        transporter: transporterName || null,
        dispatch_date: dispatchDate ? new Date(dispatchDate).toISOString() : undefined,
        lr_number: lrNumber || null,
        eway_bill_number: ewayBillNumber || null,
      };

      await updateDispatch(id, payload);
      alert("Dispatch updated successfully");
      router.push("/warehouse/dispatch");
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update Dispatch");
    } finally {
      setLoading(false);
    }
  };

  const groupedDispatchItems = useMemo(() => {
    if (!dispatchDetails?.items) return [];
    const map = new Map<string, any>();
    dispatchDetails.items.forEach((item: any) => {
      const pId = item.product_id;
      if (!map.has(pId)) {
        map.set(pId, {
          product_id: pId,
          product_name: item.product?.product_name || item.product_id,
          unit_price: item.unit_price || 0,
          total_order_qty: 0,
          total_packed_qty: 0,
          total_dispatched_qty: 0,
          total_discount: 0,
          total_gst: 0,
          total_amount: 0,
          batches: []
        });
      }
      const group = map.get(pId);
      
      const packSizeRaw = item.product?.unit_per_packing ?? item.product?.conversion_qty ?? item.product_snapshot?.conversion_qty ?? 1;
      const packSize = Number(packSizeRaw) || 1;
      
      const dispQty = Number(item.dispatched_base_qty || item.dispatched_qty || item.quantity || 0) / packSize;
      
      group.total_dispatched_qty += dispQty;
      group.total_discount += Number(item.discount_amount || 0);
      group.total_gst += Number(item.gst_amount || 0);
      group.total_amount += Number(item.item_total || 0);
      group.total_order_qty = Math.max(group.total_order_qty, Number(item.order_qty || 0) / packSize);
      group.total_packed_qty = Math.max(group.total_packed_qty, Number(item.packed_qty || 0) / packSize);
      
      const batchCode = item.batch_snapshot?.batch_code || item.inventory_batch?.batch_code || item.batch_code || "Unknown";
      const qtyType = (item.packing_done_product?.quantity_type || "N/A").toUpperCase();
      const existingBatch = group.batches.find((b: any) => b.batch_code === batchCode && b.quantity_type === qtyType);
      if (existingBatch) {
        existingBatch.qty += dispQty;
      } else {
        group.batches.push({
          id: item.id || item.dispatch_item_id,
          batch_code: batchCode,
          quantity_type: qtyType,
          qty: dispQty,
          remarks: item.remarks
        });
      }
    });
    return Array.from(map.values());
  }, [dispatchDetails]);

  if (initialLoading) {
    return (
      <FormContainer
        title="Edit Dispatch"
        description="Loading dispatch details..."
        onBack={() => router.push("/warehouse/dispatch")}
        onCancel={() => router.push("/warehouse/dispatch")}
        cancelLabel="Cancel"
      >
        <div className="h-40 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Dispatch"
      description={`Update logistics details for dispatch: ${dispatchNumber}`}
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!vehicleNumber || !driverName || loading}
            onClick={handleSubmit}
            className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> {loading ? "Updating..." : "Update Dispatch"}
          </Button>
        </div>
      }
      noCard={false}
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Pencil className="w-4 h-4 text-brand-600" /> Logistics Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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

        {dispatchDetails && (
          <div className="border-t border-border/80 pt-6 mt-6 space-y-6">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-brand-600" /> Dispatch Source Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-lg border border-border">
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Source Document No</p>
                <p className="text-sm font-bold text-foreground font-mono">{dispatchDetails.source_document_no || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Customer / Target Warehouse</p>
                <p className="text-sm font-bold text-foreground">{dispatchDetails.customer?.customer_name || dispatchDetails.target_warehouse_name || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Items</p>
                <p className="text-sm font-bold text-foreground">{dispatchDetails.total_items}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Quantity</p>
                <p className="text-sm font-bold text-foreground">{dispatchDetails.total_qty}</p>
              </div>
            </div>

            {dispatchDetails.packing_done && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-border">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Packing Done No</p>
                  <p className="text-sm font-bold text-foreground font-mono">{dispatchDetails.packing_done.packing_done_no}</p>
                </div>
                {(() => {
                  const snapshot = dispatchDetails.customer_snapshot || dispatchDetails.customer;
                  if (snapshot && dispatchDetails.source_type !== "stock_transfer") {
                    return (
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Shipping Address</p>
                        <div className="text-xs text-foreground space-y-1">
                          <p className="font-semibold">{snapshot.customer_name || snapshot.supplier_name}</p>
                          <p>{snapshot.shipping_address || snapshot.billing_address || [snapshot.address_1, snapshot.address_2].filter(Boolean).join(", ") || "No address provided."}</p>
                          {snapshot.city && <p>{snapshot.city}, {snapshot.state} {snapshot.pincode || snapshot.pincode_master?.pincode}</p>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            {dispatchDetails.items && dispatchDetails.items.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dispatched Products</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-border">
                      <tr>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Product</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Order Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Packed Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Dispatched Qty</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Unit Price</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Discount</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">GST</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Total</th>
                        <th className="px-3 py-2 font-semibold text-muted-foreground">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {groupedDispatchItems.map((group: any) => (
                        <Fragment key={group.product_id}>
                          <tr className="bg-slate-50/50">
                            <td className="px-3 py-2 font-medium">{group.product_name}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-medium">{group.total_order_qty}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-medium">{group.total_packed_qty}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-bold">{group.total_dispatched_qty}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.unit_price).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.total_discount).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono">₹{Number(group.total_gst).toFixed(2)}</td>
                            <td className="px-3 py-2 tabular-nums text-right font-mono font-bold">₹{Number(group.total_amount).toFixed(2)}</td>
                            <td className="px-3 py-2"></td>
                          </tr>
                          {group.batches.map((b: any) => (
                            <tr key={b.id} className="text-muted-foreground bg-white">
                              <td colSpan={3} className="px-3 py-1.5 pl-6 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-border" />
                                Batch: <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{b.batch_code}</span>
                                {b.quantity_type && b.quantity_type !== "N/A" && (
                                  <span className="font-mono text-[10px] bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded ml-1">
                                    {b.quantity_type}
                                  </span>
                                )}
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
