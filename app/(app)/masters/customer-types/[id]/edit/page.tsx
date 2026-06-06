"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
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
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Customer Type not found.</p>
          <Link href="/masters/customer-types" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center flex-shrink-0 gap-3 px-5 py-3 bg-white border-b border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors border rounded-lg border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none text-foreground">Edit Customer Type</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Customer Type Master → Edit</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Update Customer Type
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto bg-muted/10">
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
        </div>
      </div>

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
    </AppLayout>
  );
}
