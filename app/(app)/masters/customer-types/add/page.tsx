"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadCustomerTypes,
  saveCustomerTypes,
  nextCustomerTypeId,
  generateCustomerTypeCode,
  validateCustomerTypeInitialCode,
  type CustomerTypeRecord,
} from "../customer-type-data";
import { normalizeInitialCode } from "@/lib/masters/code-generation";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const list = loadCustomerTypes();
    setForm((prev) => ({ ...prev, customerTypeCode: generateCustomerTypeCode(list) }));
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateCustomerTypeForm(form);
    const list = loadCustomerTypes();
    const initialErr = validateCustomerTypeInitialCode(form.initialCode, list);
    if (initialErr) validation.initialCode = initialErr;
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newRecord: CustomerTypeRecord = {
      id: nextCustomerTypeId(list),
      customerTypeCode: form.customerTypeCode.trim() || generateCustomerTypeCode(list),
      initialCode: normalizeInitialCode(form.initialCode),
      customerType: form.customerType.trim(),
      description: form.description.trim(),
      documentTypes: form.documentTypes || [],
      status: "active",
      createdBy: "Admin",
      createdDate: today,
      updatedBy: "Admin",
      updatedDate: today,
    };

    saveCustomerTypes([...list, newRecord]);
    setToast({ msg: "Customer Type added successfully.", type: "success" });
    setTimeout(() => router.push("/masters/customer-types"), 900);
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
      title="Add Customer Type"
      description="Masters → Customer Type Master → Add"
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
            <Save className="w-4 h-4" /> Save Customer Type
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
