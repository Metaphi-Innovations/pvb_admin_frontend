"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VendorFormLayout } from "../../components/VendorFormLayout";
import { VendorForm } from "../../components/VendorForm";
import {
  getVendorById,
  vendorToForm,
  type VendorFormValues,
  loadVendors,
  saveVendors,
  formToVendor,
  todayStr,
  validateVendorForm,
} from "../../vendor-data";
import { CURRENT_USER } from "@/lib/procurement/config";

function Toast({ msg, type, onDismiss }: { msg: string; type: "success" | "error"; onDismiss: () => void }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {msg}
      <button type="button" className="ml-3 opacity-80" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

export default function EditVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<VendorFormValues | null>(null);
  const [vendorCode, setVendorCode] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const v = getVendorById(id);
    if (!v) {
      router.replace("/masters/vendors");
      return;
    }
    setForm(vendorToForm(v));
    setVendorCode(v.vendorCode);
    setStatus(v.status);
  }, [id, router]);

  const save = () => {
    if (!form) return;
    const err = validateVendorForm(form);
    if (err) {
      setToast({ msg: err, type: "error" });
      return;
    }
    const existing = getVendorById(id);
    if (!existing) return;
    const updated = formToVendor(form, {
      id,
      vendorCode,
      status,
      createdBy: existing.createdBy,
      createdDate: existing.createdDate,
      updatedBy: CURRENT_USER,
      updatedDate: todayStr(),
    });
    saveVendors(loadVendors().map((v) => (v.id === id ? updated : v)));
    setToast({ msg: "Vendor updated.", type: "success" });
    setTimeout(() => router.push(`/masters/vendors/${id}`), 700);
  };

  if (!form) return null;

  const vendor = getVendorById(id);

  return (
    <>
      <VendorFormLayout
        mode="edit"
        vendorCode={vendorCode}
        vendor={vendor}
        onSave={save}
        footer={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(`/masters/vendors/${id}`)}>
              Cancel
            </Button>
            <Button className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={save}>
              Save Vendor
            </Button>
          </>
        }
      >
        <VendorForm form={form} onChange={setForm} vendorCode={vendorCode} />
      </VendorFormLayout>
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </>
  );
}
