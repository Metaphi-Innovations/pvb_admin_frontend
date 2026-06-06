"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, X, Check, XCircle } from "lucide-react";
import {
  type WarehouseMaster,
  loadWarehouses,
  saveWarehouses,
  todayStr,
} from "../../warehouse-data";
import {
  WarehouseForm,
  validateWarehouseForm,
  type WarehouseFormValues,
} from "../../components/WarehouseForm";

export default function EditWarehousePage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<WarehouseMaster | null>(null);
  const [form, setForm] = useState<WarehouseFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const records = loadWarehouses();
    const found = records.find(r => r.id === id);
    if (!found) {
      router.push("/masters/warehouse");
      return;
    }
    setRecord(found);
    setForm({
      warehouseName: found.warehouseName,
      warehouseType: found.warehouseType,
      gstNumber: found.gstNumber,
      contactPerson: found.contactPerson,
      mobileNumber: found.mobileNumber,
      emailAddress: found.emailAddress,
      address: found.address,
      state: found.state,
      district: found.district,
      city: found.city,
      pincode: found.pincode,
      capacity: String(found.capacity || ""),
      manager: found.manager,
      status: found.status,
      operatedBy: found.operatedBy,
    });
  }, [id, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const clearErr = (key: string) => {
    setErrors(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSave = () => {
    if (!form || !record) return;
    const e = validateWarehouseForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }
    const records = loadWarehouses();
    const updated = records.map(r =>
      r.id === id
        ? {
            ...r,
            warehouseName: form.warehouseName,
            warehouseType: form.warehouseType,
            gstNumber: form.gstNumber,
            contactPerson: form.contactPerson,
            mobileNumber: form.mobileNumber,
            emailAddress: form.emailAddress,
            address: form.address,
            state: form.state,
            district: form.district,
            city: form.city,
            pincode: form.pincode,
            capacity: Number(form.capacity) || 0,
            manager: form.manager,
            status: form.status,
            operatedBy: form.operatedBy,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r
    );
    saveWarehouses(updated);
    setToast({ msg: "Warehouse updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/warehouse/${id}`), 900);
  };

  if (!record || !form) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
			<div className="flex flex-col h-full">
				<div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
						className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
						<h2 className="text-sm font-semibold text-foreground leading-none">Edit Warehouse</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Warehouse Master → {record.warehouseCode}</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {record.warehouseCode}
          </span>
					<Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
						className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Update Warehouse
          </Button>
        </div>

        {/* Form Content */}
				<div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/10">
          <WarehouseForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={clearErr}
            warehouseCode={record.warehouseCode}
          />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}
