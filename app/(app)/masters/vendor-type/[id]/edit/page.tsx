"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeInitialCode } from "@/lib/masters/code-generation";
import { MASTER_CURRENT_USER, masterToday } from "@/lib/masters/common";
import {
  loadVendorTypes,
  saveVendorTypes,
  validateVendorTypeInitialCode,
  resolveVendorTypeCode,
  validateVendorTypeCodeUnique,
  findVendorTypeDuplicate,
  vendorTypeToFormValues,
} from "../../vendor-type-data";
import {
  VendorTypeForm,
  validateVendorTypeForm,
  type VendorTypeFormValues,
} from "../../components/VendorTypeForm";

export default function EditVendorTypePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<VendorTypeFormValues | null>(null);
  const [originalInitialCode, setOriginalInitialCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const found = loadVendorTypes().find((item) => item.id === Number(id));
    if (!found) return;
    setOriginalInitialCode(found.initialCode);
    setForm(vendorTypeToFormValues(found));
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form) return;
    const validation = validateVendorTypeForm(form);
    const list = loadVendorTypes();
    const initialErr = validateVendorTypeInitialCode(form.initialCode, list, Number(id));
    if (initialErr) validation.initialCode = initialErr;
    if (findVendorTypeDuplicate(form.vendorTypeName, list, Number(id))) {
      validation.vendorTypeName = "Vendor type name must be unique.";
    }
    const existing = list.find((item) => item.id === Number(id));
    const vendorTypeCode = resolveVendorTypeCode(form.initialCode, list, {
      recordId: Number(id),
      existingCode: existing?.vendorTypeCode,
      originalInitialCode,
    });
    const codeErr = validateVendorTypeCodeUnique(vendorTypeCode, list, Number(id));
    if (codeErr) validation.vendorTypeCode = codeErr;
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const today = masterToday();
    const updated = list.map((item) =>
      item.id === Number(id)
        ? {
            ...item,
            vendorTypeCode,
            vendorTypeName: form.vendorTypeName.trim(),
            initialCode: normalizeInitialCode(form.initialCode),
            description: form.description.trim(),
            status: form.status,
            updatedBy: MASTER_CURRENT_USER,
            updatedAt: today,
          }
        : item,
    );

    saveVendorTypes(updated);
    setToast({ msg: "Vendor type updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/vendor-type/${id}`), 900);
  };

  if (!form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Vendor type not found.</p>
        <Link href="/masters/vendor-type" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Vendor Type"
      description="Masters → Vendor Type Master → Edit"
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
            <Save className="w-4 h-4" /> Update Vendor Type
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
        recordId={Number(id)}
        originalInitialCode={originalInitialCode}
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
