"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords, loadMasterRecords } from "@/lib/masters/common";
import { ProductDiscountSchemeForm } from "../components/ProductDiscountSchemeForm";
import {
  DEFAULT_PRODUCT_DISCOUNT_FORM,
  getProductDiscountCodePreview,
  loadConsolidatedSchemeRecords,
  productDiscountFormToRecord,
  validateProductDiscountForm,
  type ProductDiscountForm,
} from "../product-discount-scheme";
import { SCHEME_STORAGE_KEY } from "../scheme-data";

export default function SchemeAddPageClient() {
  const router = useRouter();
  const [form, setForm] = useState<ProductDiscountForm>({ ...DEFAULT_PRODUCT_DISCOUNT_FORM });
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const codePreview = useMemo(() => getProductDiscountCodePreview(), []);

  const handleSave = () => {
    const list = loadConsolidatedSchemeRecords();
    const err = validateProductDiscountForm(form, "add", list);
    if (err) {
      setFormError(err);
      setToast({ msg: err, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const startId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const newRecord = productDiscountFormToRecord(form, list, startId);
    saveMasterRecords(SCHEME_STORAGE_KEY, [...list, newRecord]);

    setToast({ msg: "Product discount scheme submitted for approval", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  return (
    <FormContainer
      title="Create Product Discount Scheme"
      description="Masters → Scheme Management → Product Discount"
      onBack={() => router.push("/masters/scheme")}
      noCard
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.push("/masters/scheme")}
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
      <ProductDiscountSchemeForm
        form={form}
        onChange={(next) => {
          setForm(next);
          setFormError("");
        }}
        mode="add"
        codePreview={codePreview}
        error={formError}
      />

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
