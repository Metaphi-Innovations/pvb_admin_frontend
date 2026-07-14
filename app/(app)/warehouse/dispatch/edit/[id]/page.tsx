"use client";

import React, { useEffect, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
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
      </div>
    </FormContainer>
  );
}
