"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  loadProducts,
  nextProductId,
  resolveProductCodeForSave,
  saveProducts,
  todayStr,
  type ProductImage,
  type ProductUrl,
} from "../product-data";
import {
  DEFAULT_PRODUCT_FORM,
  formValuesToProduct,
  ProductForm,
  type ProductFormValues,
  validateProductForm,
} from "../components/ProductForm";
import { useCreateProduct } from "@/hooks/masters";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const createMutation = useCreateProduct();

  const handleSave = () => {
    const list = loadProducts();
    const resolvedForm = {
      ...form,
      productCode: resolveProductCodeForSave(form.category, form.productCode, list),
    };
    setForm(resolvedForm);

    const validation = validateProductForm(resolvedForm);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      const firstError = Object.values(validation)[0];
      setToast({
        msg: firstError ?? "Please fix the errors before saving.",
        type: "error",
      });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const parseNum = (val: string) => {
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const payload = {
      product_code: resolvedForm.productCode,
      product_name: resolvedForm.productName,
      sku: resolvedForm.sku,
      supplier_id: resolvedForm.supplier || null,
      supplier_code: resolvedForm.supplierCode || null,
      hsn_id: resolvedForm.hsnId || resolvedForm.hsnCode || null,
      gst_rate_id: resolvedForm.gstId || null,
      category_name: resolvedForm.category,
      segment_name: resolvedForm.segment,
      form_name: resolvedForm.form,
      cfu: resolvedForm.cfu || null,
      authority: resolvedForm.authority || null,
      pack_size: parseNum(resolvedForm.packSize),
      base_unit: resolvedForm.baseUnit,
      unit: resolvedForm.baseUnit,
      mou: resolvedForm.mou || null,
      unit_per_case: parseNum(resolvedForm.unitPerCase),
      units_per_case: parseNum(resolvedForm.unitPerCase),
      packaging_unit: resolvedForm.packagingUnit,
      net_weight: parseNum(resolvedForm.netWeightPerPackagingUnit),
      net_weight_per_packaging_unit: parseNum(resolvedForm.netWeightPerPackagingUnit),
      gross_weight: parseNum(resolvedForm.grossWeight),
      mrp: parseNum(resolvedForm.mrp),
      is_active: resolvedForm.status === "active",
      status: resolvedForm.status === "active" ? "Active" : "Inactive",
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setToast({ msg: "Product created successfully.", type: "success" });
        setTimeout(() => router.push("/masters/products"), 900);
      },
      onError: (err) => {
        setToast({
          msg: err instanceof Error ? err.message : "Failed to save product.",
          type: "error",
        });
        setTimeout(() => setToast(null), 4000);
      },
    });
  };

  return (
    <FormContainer
      title="Add Product"
      description="Masters → Product Master → Add"
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <ProductForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
        productImages={productImages}
        productUrls={productUrls}
        onImageAdd={(items) => setProductImages((prev) => [...prev, ...items])}
        onImageRemove={(id) => setProductImages((prev) => prev.filter((item) => item.id !== id))}
        onUrlAdd={(item) => setProductUrls((prev) => [...prev, item])}
        onUrlRemove={(id) => setProductUrls((prev) => prev.filter((item) => item.id !== id))}
        isNew
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
