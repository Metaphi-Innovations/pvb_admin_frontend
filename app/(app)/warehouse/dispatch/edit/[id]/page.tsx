"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ArrowLeft, Truck, Package, Save } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { getDispatchById, saveDispatch } from "../../services";
import { DispatchRecord } from "../../types";
import { WAREHOUSE_OPTIONS, DELIVERY_STATUS_OPTIONS } from "../../constants";

export default function EditDispatchPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [record, setRecord] = useState<DispatchRecord | null>(null);

  useEffect(() => {
    if (id) setRecord(getDispatchById(id) || null);
  }, [id]);

  const handleChange = (field: keyof DispatchRecord, value: string) => {
    if (!record) return;
    setRecord({ ...record, [field]: value });
  };

  const handleSubmit = () => {
    if (!record) return;
    saveDispatch(record);
    router.push("/warehouse/dispatch");
  };

  if (!record) {
    return (
      <FormContainer title="Edit Dispatch" onBack={() => router.push("/warehouse/dispatch")}>
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">Loading dispatch record...</div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Dispatch"
      description={`Update details for dispatch note ${record.dispatchNumber}`}
      onBack={() => router.push("/warehouse/dispatch")}
      onCancel={() => router.push("/warehouse/dispatch")}
      cancelLabel="Cancel"
      actions={
        <Button size="sm" onClick={handleSubmit} className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
          <Save className="w-3.5 h-3.5" /> Save Changes
        </Button>
      }
      noCard={false}
    >
      <div className="space-y-6">
        {/* Dispatch Header Fields */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-brand-600" /> Header Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Number</p>
              <Input value={record.dispatchNumber} disabled className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Sales Order No</p>
              <Input value={record.salesOrderNumber} disabled className="h-8 text-xs bg-slate-50 font-mono mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Customer</p>
              <Input value={record.customer} disabled className="h-8 text-xs bg-slate-50 mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dispatch Date *</p>
              <Input type="date" value={record.dispatchDate} onChange={e => handleChange("dispatchDate", e.target.value)} className="h-8 text-xs mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Vehicle Number *</p>
              <Input value={record.vehicleNumber} onChange={e => handleChange("vehicleNumber", e.target.value)} className="h-8 text-xs mt-1.5" placeholder="e.g. MH-12-AB-1234" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Driver Name *</p>
              <Input value={record.driverName} onChange={e => handleChange("driverName", e.target.value)} className="h-8 text-xs mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Transporter Name</p>
              <Input value={record.transporterName} onChange={e => handleChange("transporterName", e.target.value)} className="h-8 text-xs mt-1.5" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Warehouse</p>
              <AutocompleteSelect
                options={WAREHOUSE_OPTIONS}
                value={record.warehouse}
                onChange={v => handleChange("warehouse", v)}
                placeholder="Select warehouse"
                searchPlaceholder="Search warehouse..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Delivery Status</p>
              <AutocompleteSelect
                options={DELIVERY_STATUS_OPTIONS}
                value={record.deliveryStatus}
                onChange={v => handleChange("deliveryStatus", v)}
                placeholder="Select status"
                searchPlaceholder="Search status..."
                className="h-8 text-xs mt-1.5 rounded-lg border-border bg-white"
              />
            </div>
          </div>
        </div>

        {/* Product View (Read-only) */}
        <div className="border-t border-border/80 pt-6 mt-6 space-y-4">
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-brand-600" /> Products (Read-only)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-slate-50/60">
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Product</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">SKU</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Packed Qty</th>
                  <th className="py-2.5 px-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Dispatch Qty</th>
                </tr>
              </thead>
              <tbody>
                {record.products.map((p, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-slate-50/40">
                    <td className="py-3 px-3 text-xs font-bold">{p.product}</td>
                    <td className="py-3 px-3 text-xs font-mono font-bold text-brand-700">{p.sku}</td>
                    <td className="py-3 px-3 text-xs font-bold text-center">{p.packedQty}</td>
                    <td className="py-3 px-3 text-xs font-bold text-center">{p.dispatchQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </FormContainer>
  );
}
