"use client";

import { Package, Truck, User, Building, Calendar, CheckCircle2 } from "lucide-react";
import type { DispatchRecord } from "@/app/(app)/warehouse/dispatch/types";

export function DispatchDetailsPanel({ dispatch }: { dispatch: DispatchRecord }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Sales Order No", value: dispatch.salesOrderNumber, icon: Package },
          { label: "Customer", value: dispatch.customer || dispatch.customer_name, icon: User },
          { label: "Warehouse", value: dispatch.warehouse || dispatch.source_warehouse_name, icon: Building },
          { label: "Dispatch Date", value: dispatch.dispatchDate || dispatch.dispatch_date, icon: Calendar },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-border rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center">
                <card.icon className="w-3 h-3 text-brand-600" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
            </div>
            <p className="text-xs font-bold text-foreground leading-tight">{card.value || "—"}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-3">
          <Truck className="w-3.5 h-3.5 text-brand-600" /> Vehicle & Transport Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Dispatch No", value: dispatch.dispatchNumber || dispatch.dispatch_no },
            { label: "Vehicle Number", value: dispatch.vehicleNumber },
            { label: "Driver Name", value: dispatch.driverName },
            { label: "Transporter Name", value: dispatch.transporterName },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{item.label}</p>
              <p className="text-xs font-bold text-foreground mt-0.5">{item.value || "—"}</p>
            </div>
          ))}
        </div>
      </div>

      {dispatch.deliveryDetails && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200 pb-2 flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Delivery Confirmation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Delivery Date</p>
              <p className="text-xs font-bold text-emerald-900 mt-0.5">{dispatch.deliveryDetails.deliveryDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Received By</p>
              <p className="text-xs font-bold text-emerald-900 mt-0.5">{dispatch.deliveryDetails.receiverName}</p>
            </div>
            <div>
              <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Remarks</p>
              <p className="text-xs font-bold text-emerald-900 mt-0.5">{dispatch.deliveryDetails.remarks || "—"}</p>
            </div>
          </div>
        </div>
      )}

      {dispatch.packingNumbers?.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-4 shadow-sm">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5 mb-3">
            <Package className="w-3.5 h-3.5 text-brand-600" /> Linked Packing References
          </h3>
          <div className="flex flex-wrap gap-2">
            {dispatch.packingNumbers.map((pn) => (
              <span
                key={pn}
                className="inline-flex items-center text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-brand-200 bg-brand-50 text-brand-700"
              >
                {pn}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
