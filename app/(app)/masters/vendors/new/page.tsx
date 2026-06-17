"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { VendorForm } from "../components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  type VendorFormValues,
  loadVendors,
  saveVendors,
  formToVendor,
  nextId,
  todayStr,
  validateVendorForm,
  generateVendorCodeForType,
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
    if (!form.vendorType) {
      setVendorCode("");
      return;
    }
    setVendorCode(generateVendorCodeForType(form.vendorType, loadVendors()));
  }, [form.vendorType]);

  const save = () => {
    const err = validateVendorForm(form);
    if (err) {
      setToast({ msg: err, type: "error" });
      return;
    }
    if (!vendorCode) {
      setToast({ msg: "Select a vendor type to generate vendor code.", type: "error" });
      return;
    }
    const list = loadVendors();
    const today = todayStr();
    const record = formToVendor(form, {
      id: nextId(list),
      vendorCode,
      status: "active",
      createdBy: CURRENT_USER,
      createdDate: today,
      updatedBy: CURRENT_USER,
      updatedDate: today,
    });
    saveVendors([...list, record]);
    setToast({ msg: "Vendor created.", type: "success" });
    setTimeout(() => router.push("/masters/vendors"), 700);
  };

  return (
    <FormContainer
      title="Create Vendor"
      description="Masters → Vendor Master → New"
      onBack={() => router.push("/masters/vendors")}
      actions={
        <div className="flex items-center gap-2">
          {vendorCode && (
            <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
              {vendorCode}
            </span>
          )}
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.push("/masters/vendors")}>
            Cancel
          </Button>
          <Button className="h-9 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white" onClick={save}>
            Save Vendor
          </Button>
        </div>
      }
    >
      <VendorForm form={form} onChange={setForm} />
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
