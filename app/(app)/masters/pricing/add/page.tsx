"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PricingForm } from "../components/PricingForm";
import {
  DEFAULT_PRICING_FORM,
  PRICING_STORAGE_KEY,
  expandPricingFormToRecords,
  loadActiveProductOptions,
  loadPricingRecords,
  validatePricingForm,
  type PricingForm as PricingFormValues,
} from "../pricing-data";
import { saveMasterRecords } from "@/lib/masters/common";

export default function AddPricingPage() {
  const router = useRouter();
  const [form, setForm] = useState<PricingFormValues>(DEFAULT_PRICING_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const productOptions = useMemo(() => loadActiveProductOptions(), []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const list = loadPricingRecords();
    const fieldErrors = validatePricingForm(form, list);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const firstError = Object.values(fieldErrors)[0];
      setToast({
        msg: firstError ?? "Please fix the errors before saving.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    let nextId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const newRecords = expandPricingFormToRecords(form, nextId);

    const updatedList = [...list, ...newRecords];
    saveMasterRecords(PRICING_STORAGE_KEY, updatedList);
    setToast({
      msg:
        newRecords.length > 1
          ? `${newRecords.length} pricing rules added successfully.`
          : "Pricing rule added successfully.",
      type: "success",
    });
    setTimeout(() => router.push("/masters/pricing"), 900);
  };

  return (
    <FormContainer
      title="Add Pricing"
      description="Masters → Pricing Master → Add"
      noCard
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.back()}
          >
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <PricingForm
        form={form}
        onChange={setForm}
        errors={errors}
        productOptions={productOptions}
        mode="add"
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
