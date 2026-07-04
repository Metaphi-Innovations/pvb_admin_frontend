"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeInitialCode } from "@/lib/masters/code-generation";
import { CustomerTypeListService } from "@/services/customer-type-list.service";
import {
  CustomerTypeForm,
  DEFAULT_CUSTOMER_TYPE_FORM,
  type CustomerTypeFormValues,
  validateCustomerTypeForm,
} from "../components/CustomerTypeForm";
import type { CustomerTypeDocument } from "../customer-type-data";

function extractDocumentTypeIds(documents: CustomerTypeDocument[]): string[] {
  return documents
    .map((doc) => doc.documentTypeId)
    .filter((id): id is string => Boolean(id));
}

export default function AddCustomerTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerTypeFormValues>(DEFAULT_CUSTOMER_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = async () => {
    const validation = validateCustomerTypeForm(form);
    const documentTypeIds = extractDocumentTypeIds(form.documentTypes || []);
    if ((form.documentTypes || []).length > 0 && documentTypeIds.length === 0) {
      validation.documentTypes = "Select document types from the list";
    }
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    try {
      setSaving(true);
      await CustomerTypeListService.create({
        customerInitialCode: normalizeInitialCode(form.initialCode),
        customerTypeName: form.customerType,
        description: form.description,
        documentTypeIds,
      });
      setToast({ msg: "Customer Type added successfully.", type: "success" });
      setTimeout(() => router.push("/masters/customer-types"), 900);
    } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      setToast({ msg: err?.message || "Failed to create customer type.", type: "error" });
      setTimeout(() => setToast(null), 3200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormContainer
      title="Add Customer Type"
      description="Masters → Customer Type Master → Add"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.back()}
            disabled={saving}
          >
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Customer Type"}
          </Button>
        </div>
      }
    >
      <CustomerTypeForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
        triggerToast={(msg, type) => {
          setToast({ msg, type });
          setTimeout(() => setToast(null), 3200);
        }}
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
