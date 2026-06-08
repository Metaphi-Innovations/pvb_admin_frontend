"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCustomerTypes, saveCustomerTypes, type CustomerTypeRecord } from "../../customer-type-data";
import {
  CustomerTypeForm,
  type CustomerTypeFormValues,
  validateCustomerTypeForm,
} from "../../components/CustomerTypeForm";

export default function EditCustomerTypePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<CustomerTypeFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const list = loadCustomerTypes();
    const found = list.find((c) => c.id === Number(id));
    if (!found) return;
    setForm({
      customerType: found.customerType,
      description: found.description,
      documentTypes: found.documentTypes || [],
    });
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form) return;
    const validation = validateCustomerTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadCustomerTypes();
    const updated = list.map((c) =>
      c.id === Number(id)
        ? {
            ...c,
            customerType: form.customerType.trim(),
            description: form.description.trim(),
            documentTypes: form.documentTypes || [],
          }
        : c,
    );

    saveCustomerTypes(updated);
    setToast({ msg: "Customer Type updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/customer-types/${id}`), 900);
  };

  if (!form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Customer Type not found.</p>
        <Link href="/masters/customer-types" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Customer Type"
      description="Masters → Customer Type Master → Edit"
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
            <Save className="w-4 h-4" /> Update Customer Type
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
