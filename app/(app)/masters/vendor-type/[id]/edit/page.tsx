"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  VendorTypeForm,
  validateVendorTypeForm,
  type VendorTypeFormValues,
} from "../../components/VendorTypeForm";
import { useSupplierType, useUpdateSupplierType } from "@/hooks/masters";
import { SupplierTypeListService } from "@/services/supplier-type.service";

export default function EditVendorTypePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<VendorTypeFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: supplierType, isLoading, isError } = useSupplierType(id);
  const updateMutation = useUpdateSupplierType();

  useEffect(() => {
    if (!supplierType) return;
    setForm({
      vendorTypeName: supplierType.supplierTypeName,
      vendorTypeCode: "",
      initialCode: supplierType.initialCode,
      description: supplierType.description ?? "",
      status: supplierType.status,
    });
  }, [supplierType]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form || !id) return;
    const validation = validateVendorTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    updateMutation.mutate(
      {
        id,
        payload: {
          supplier_type_name: form.vendorTypeName.trim(),
          initial_code: form.initialCode.trim().toUpperCase(),
          description: form.description.trim() || null,
          is_active: form.status === "active",
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Supplier type updated successfully.", type: "success" });
          setTimeout(() => router.push(`/masters/vendor-type/${id}`), 900);
        },
        onError: (err) => {
          const msg =
            err instanceof Error
              ? err.message
              : SupplierTypeListService.extractErrorMessage(err, "Failed to update supplier type.");
          setToast({ msg, type: "error" });
          setTimeout(() => setToast(null), 4000);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading supplier type details...</p>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Supplier type not found.</p>
        <Link href="/masters/vendor-type" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Supplier Type"
      description="Masters → Supplier Type Master → Edit"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" /> Update Supplier Type
          </Button>
        </div>
      }
    >
      <VendorTypeForm
        form={form}
        onChange={(next) =>
          setForm((prev) => {
            if (!prev) return prev;
            return typeof next === "function" ? next(prev) : next;
          })
        }
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
