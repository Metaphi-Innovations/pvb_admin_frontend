"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadCustomerTypes,
  saveCustomerTypes,
  nextCustomerTypeId,
  type CustomerTypeRecord,
} from "../customer-type-data";
import {
  CustomerTypeForm,
  DEFAULT_CUSTOMER_TYPE_FORM,
  type CustomerTypeFormValues,
  validateCustomerTypeForm,
} from "../components/CustomerTypeForm";

export default function AddCustomerTypePage() {
  const router = useRouter();
  const [form, setForm] = useState<CustomerTypeFormValues>(DEFAULT_CUSTOMER_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateCustomerTypeForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadCustomerTypes();
    const newRecord: CustomerTypeRecord = {
      id: nextCustomerTypeId(list),
      customerType: form.customerType.trim(),
      description: form.description.trim(),
      documentTypes: form.documentTypes || [],
    };

    saveCustomerTypes([...list, newRecord]);
    setToast({ msg: "Customer Type added successfully.", type: "success" });
    setTimeout(() => router.push("/masters/customer-types"), 900);
  };

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
            <h2 className="text-sm font-semibold leading-none text-foreground">Add Customer Type</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Customer Type Master → Add</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Save Customer Type
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
