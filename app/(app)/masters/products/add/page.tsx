"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildProductApiAssets,
  collectNewProductImageFiles,
  loadProducts,
  resolveProductCodeForSave,
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUuidOrNull(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { data: previewNumber } = useProductPreviewNumber(
    form.packSize,
    form.baseUnit,
  );
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
      const trimmed = val.trim();
      if (!trimmed) return null;
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : null;
    };

    const payload = {
      product_code: resolvedForm.productCode,
      product_name: resolvedForm.productName,
      scientific_name: resolvedForm.scientificName || null,
      sku: resolvedForm.sku,
      supplier_id: toUuidOrNull(resolvedForm.supplier),
      supplier_code: resolvedForm.supplierCode || null,
      hsn_id: toUuidOrNull(resolvedForm.hsnId || resolvedForm.hsnCode),
      gst_rate_id: toUuidOrNull(resolvedForm.gstId),
      category_id: toUuidOrNull(resolvedForm.categoryId),
      segment_id: toUuidOrNull(resolvedForm.segmentId),
      formulation_id: toUuidOrNull(resolvedForm.formId),
      cfu_id: toUuidOrNull(resolvedForm.cfuId),
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
      cost_price: parseNum(resolvedForm.costPrice),
      is_active: resolvedForm.status === "active",
      status: resolvedForm.status === "active" ? "Active" : "Inactive",
      assets: buildProductApiAssets(productImages, productUrls),
    };

    createMutation.mutate(
      {
        payload,
        images: collectNewProductImageFiles(productImages),
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
