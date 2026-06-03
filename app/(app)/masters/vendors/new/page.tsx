"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VendorFormLayout } from "../components/VendorFormLayout";
import { VendorForm } from "../components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  type VendorFormValues,
  loadVendors,
  saveVendors,
  generateVendorCode,
  formToVendor,
  nextId,
  todayStr,
  validateVendorForm,
} from "../vendor-data";
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

export default function NewVendorPage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorFormValues>(DEFAULT_VENDOR_FORM);
  const [vendorCode, setVendorCode] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const list = loadVendors();
    const code = generateVendorCode(list);
    setVendorCode(code);
    setForm((f) => ({ ...f, vendorCode: code }));
  }, []);

  const save = () => {
    const err = validateVendorForm(form);
    if (err) {
      setToast({ msg: err, type: "error" });
      return;
    }
    const list = loadVendors();
    const today = todayStr();
    const record = formToVendor(
      { ...form, vendorCode },
      {
        id: nextId(list),
        vendorCode,
        status: "active",
        createdBy: CURRENT_USER,
        createdDate: today,
        updatedBy: CURRENT_USER,
        updatedDate: today,
      },
    );
    saveVendors([...list, record]);
    setToast({ msg: "Vendor created.", type: "success" });
    setTimeout(() => router.push("/masters/vendors"), 700);
  };

  return (
    <>
      <VendorFormLayout
        mode="create"
        vendorCode={vendorCode}
        onSave={save}
        footer={
          <>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/masters/vendors")}>
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
