"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VendorTypeForm,
  DEFAULT_VENDOR_TYPE_FORM,
  validateVendorTypeForm,
  type VendorTypeFormValues,
} from "../components/VendorTypeForm";
import { useCreateSupplierType } from "@/hooks/masters";
import { SupplierTypeListService } from "@/services/supplier-type.service";

export default function AddVendorTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorTypeFormValues>(DEFAULT_VENDOR_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const createMutation = useCreateSupplierType();

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateVendorTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    createMutation.mutate(
      {
        supplier_type_name: form.vendorTypeName.trim(),
        initial_code: form.initialCode.trim().toUpperCase(),
        description: form.description.trim() || null,
        is_active: form.status === "active",
      },
      {
        onSuccess: () => {
          setToast({ msg: "Supplier type added successfully.", type: "success" });
          setTimeout(() => router.push("/masters/vendor-type"), 900);
        },
        onError: (err) => {
          const msg =
            err instanceof Error
              ? err.message
              : SupplierTypeListService.extractErrorMessage(err, "Failed to save supplier type.");
          setToast({ msg, type: "error" });
          setTimeout(() => setToast(null), 4000);
        },
      },
    );
  };

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
            disabled={createMutation.isPending}
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
