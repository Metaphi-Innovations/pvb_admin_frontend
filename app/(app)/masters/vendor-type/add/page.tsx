"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import {
  VendorTypeForm,
  DEFAULT_VENDOR_TYPE_FORM,
  validateVendorTypeForm,
  type VendorTypeFormValues,
} from "../components/VendorTypeForm";
import { useCreateSupplierType } from "@/hooks/masters/use-supplier-types";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { showToast } from "@/lib/toast";

export default function AddVendorTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorTypeFormValues>(DEFAULT_VENDOR_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useCreateSupplierType();

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (createMutation.isPending) return;
    const validation = validateVendorTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      showToast("Please fix the errors before saving.", "error");
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
          showToast("Supplier type added successfully.", "success");
          router.replace("/masters/vendor-type");
        },
        onError: (err) => {
          showToast(getErrorMessage(err, "Failed to save supplier type."), "error");
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
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? "Saving..." : "Save Supplier Type"}
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
    </FormContainer>
  );
}
