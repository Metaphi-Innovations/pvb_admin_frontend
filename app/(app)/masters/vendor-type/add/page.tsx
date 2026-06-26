"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeInitialCode } from "@/lib/masters/code-generation";
import { MASTER_CURRENT_USER, masterToday } from "@/lib/masters/common";
import {
  loadVendorTypes,
  saveVendorTypes,
  nextVendorTypeId,
  generateVendorTypeCode,
  validateVendorTypeInitialCode,
  validateVendorTypeCodeUnique,
  findVendorTypeDuplicate,
  type VendorTypeRecord,
} from "../vendor-type-data";
import {
  VendorTypeForm,
  DEFAULT_VENDOR_TYPE_FORM,
  validateVendorTypeForm,
  type VendorTypeFormValues,
} from "../components/VendorTypeForm";

export default function AddVendorTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorTypeFormValues>(DEFAULT_VENDOR_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateVendorTypeForm(form);
    const list = loadVendorTypes();
    const initialErr = validateVendorTypeInitialCode(form.initialCode, list);
    if (initialErr) validation.initialCode = initialErr;
    if (findVendorTypeDuplicate(form.vendorTypeName, list)) {
      validation.vendorTypeName = "Supplier type name must be unique.";
    }
    const vendorTypeCode =
      form.vendorTypeCode.trim() ||
      generateVendorTypeCode(form.initialCode, list);
    const codeErr = validateVendorTypeCodeUnique(vendorTypeCode, list);
    if (codeErr) validation.vendorTypeCode = codeErr;
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const today = masterToday();
    const newRecord: VendorTypeRecord = {
      id: nextVendorTypeId(list),
      vendorTypeCode,
      vendorTypeName: form.vendorTypeName.trim(),
      initialCode: normalizeInitialCode(form.initialCode),
      description: form.description.trim(),
      status: form.status,
      createdBy: MASTER_CURRENT_USER,
      updatedBy: MASTER_CURRENT_USER,
      createdAt: today,
      updatedAt: today,
    };

    saveVendorTypes([...list, newRecord]);
    setToast({ msg: "Supplier type added successfully.", type: "success" });
    setTimeout(() => router.push("/masters/vendor-type"), 900);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <FormContainer
      title="Add Supplier Type"
      description="Masters → Supplier Type Master → Add"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" /> Save Supplier Type
          </Button>
        </div>
      }
    >
      <VendorTypeForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
      />

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
