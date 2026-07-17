"use client";

import React, { useEffect, useState } from "react";
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
  getProductApiValidationToastMessage,
  isProductApiValidationError,
  mapProductApiErrorsToFormFields,
} from "../product-data";
import {
  DEFAULT_PRODUCT_FORM,
  formValuesToProduct,
  ProductForm,
  type ProductFormValues,
  validateProductForm,
} from "../components/ProductForm";
import { useCreateProduct, useProductPreviewNumber } from "@/hooks/masters";
import { ProductListService } from "@/services/product-list.service";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { data: previewNumber } = useProductPreviewNumber();
  // console.log("Asdadsd", previewNumber);
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
      scientific_name: resolvedForm.scientificName || null,
      sku: resolvedForm.sku,
      supplier_id: resolvedForm.supplier || null,
      supplier_code: resolvedForm.supplierCode || null,
      hsn_id: resolvedForm.hsnId || resolvedForm.hsnCode || null,
      gst_rate_id: resolvedForm.gstId || null,
      category_id: resolvedForm.category,
      segment_id: resolvedForm.segment,
      formulation_id: resolvedForm.form,
      cfu_id: resolvedForm.cfu || null,
      authority: resolvedForm.authority || null,
      pack_size: parseNum(resolvedForm.packSize),
      base_unit: resolvedForm.baseUnit,
      unit: resolvedForm.baseUnit,
      mou: resolvedForm.mou || null,
      unit_per_packing: parseNum(resolvedForm.unitPerCase),
      packing_unit: resolvedForm.packagingUnit,
      net_weight: parseNum(resolvedForm.netWeightPerPackagingUnit),
      gross_weight: parseNum(resolvedForm.grossWeight),
      mrp: parseNum(resolvedForm.mrp),
      is_active: resolvedForm.status === "active",
      status: resolvedForm.status === "active" ? "Active" : "Inactive",
      assets: productUrls.map((u) => ({
        asset_type: "LINK",
        link_url: u.url,
      })),
    };

    createMutation.mutate(
      {
        payload,
        images: productImages
          .map((img) => img.file)
          .filter((f): f is File => !!f),
      },
      {
        onSuccess: () => {
          setToast({
            msg: "Product created successfully.",
            type: "success",
          });
          setTimeout(() => router.push("/masters/products"), 900);
        },
        onError: (err) => {
          if (isProductApiValidationError(err)) {
            const apiFieldErrors = mapProductApiErrorsToFormFields(err);
            if (Object.keys(apiFieldErrors).length > 0) {
              setErrors((prev) => ({ ...prev, ...apiFieldErrors }));
            }
            setToast({
              msg: getProductApiValidationToastMessage(
                err,
                "Please fix the validation errors.",
              ),
              type: "error",
            });
            setTimeout(() => setToast(null), 5000);
            return;
          }

          setToast({
            msg: ProductListService.extractErrorMessage(
              err,
              "Failed to save product.",
            ),
            type: "error",
          });
          setTimeout(() => setToast(null), 4000);
        },
      }
    );
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
        previewNumber={previewNumber}
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
            "fixed top-5 right-5 z-[100] flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium max-w-md",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          )}
          <span className="leading-snug whitespace-pre-wrap">{toast.msg}</span>
        </div>
      )}
    </FormContainer>
  );
}
