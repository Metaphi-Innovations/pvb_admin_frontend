"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  buildProductApiAssets,
  collectNewProductImageFiles,
  getProductImages,
  getProductUrls,
  mapApiMediaAssetToProductImage,
  Product,
  type ProductImage,
  type ProductUrl,
  getProductApiValidationToastMessage,
  isProductApiValidationError,
  mapProductApiErrorsToFormFields,
} from "../../product-data";
import {
  ProductForm,
  productToFormValues,
  type ProductFormValues,
  validateProductForm,
} from "../../components/ProductForm";
import { useProduct, useProductPreviewNumber, useUpdateProduct } from "@/hooks/masters";
import { ProductListService } from "@/services/product-list.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUuidOrNull(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<ProductFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const { data: apiProduct, isLoading, isError } = useProduct(id);
  const updateMutation = useUpdateProduct();
  const initialPackRef = useRef<{ packSize: string; baseUnit: string } | null>(
    null,
  );

  const packOrUnitChanged = useMemo(() => {
    if (!form || !initialPackRef.current) return false;
    return (
      form.packSize !== initialPackRef.current.packSize ||
      form.baseUnit !== initialPackRef.current.baseUnit
    );
  }, [form?.packSize, form?.baseUnit]);

  const { data: previewNumber } = useProductPreviewNumber(
    packOrUnitChanged ? form?.packSize : undefined,
    packOrUnitChanged ? form?.baseUnit : undefined,
    apiProduct?.productUuid,
  );

  useEffect(() => {
    if (!apiProduct) return;
    const mappedProduct: Product = {
      id: apiProduct.id,
      productId: apiProduct.productUuid,
      productCode: apiProduct.productCode,
      productName: apiProduct.productName,
      sku: apiProduct.sku,
      supplier: apiProduct.supplierId || "",
      supplierCode: apiProduct.supplierCode || undefined,
      category: apiProduct.category,
      categoryId: apiProduct.categoryId,
      subCategory: apiProduct.subCategory,
      segment: apiProduct.segment,
      segmentId: apiProduct.segmentId,
      form: apiProduct.form || "",
      formId: apiProduct.formId,
      cfu: apiProduct.cfu || undefined,
      cfuId: apiProduct.cfuId,
      authority: apiProduct.authority || undefined,
      hsnCode: apiProduct.hsnUuid || apiProduct.hsnCode,
      hsnId: apiProduct.hsnUuid || (apiProduct.hsnId ? String(apiProduct.hsnId) : ""),
      gstRate: apiProduct.gstRate || "",
      gstId: apiProduct.gstUuid || (apiProduct.gstId ? String(apiProduct.gstId) : ""),
      packSize: apiProduct.packSize ?? undefined,
      baseUnit: apiProduct.baseUnit,
      mou: apiProduct.mou || undefined,
      unitPerCase: apiProduct.unitPerCase ?? undefined,
      packagingUnit: apiProduct.packagingUnit || "",
      netWeightPerPackagingUnit: apiProduct.netWeight ?? undefined,
      grossWeight: apiProduct.grossWeight ?? undefined,
      mrp: apiProduct.mrp ?? undefined,
      costPrice: apiProduct.costPrice != null ? apiProduct.costPrice : undefined,
      status: apiProduct.status,
      createdBy: apiProduct.createdBy || "Admin",
      createdDate: apiProduct.createdAt || "",
      updatedBy: apiProduct.updatedBy || "Admin",
      updatedDate: apiProduct.updatedAt || "",
      productImages: (apiProduct.assets ?? [])
        .filter((a) => a.asset_type === "MEDIA")
        .map(mapApiMediaAssetToProductImage),
      productUrls: (apiProduct.assets ?? [])
        .filter((a) => a.asset_type === "LINK")
        .map((a) => ({
          id: a.product_asset_id ?? crypto.randomUUID(),
          url: a.link_url ?? "",
        })),
    };

    const nextForm = productToFormValues(mappedProduct);
    if (apiProduct.costPrice != null) {
      nextForm.costPrice = String(apiProduct.costPrice);
    }
    initialPackRef.current = {
      packSize: nextForm.packSize,
      baseUnit: nextForm.baseUnit,
    };
    setForm(nextForm);
    setProductImages(getProductImages(mappedProduct));
    setProductUrls(getProductUrls(mappedProduct));
  }, [apiProduct]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form || !id) return;
    const validation = validateProductForm(form);
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
      product_code: form.productCode,
      product_name: form.productName,
      scientific_name: form.scientificName || null,
      sku: form.sku,
      supplier_id: toUuidOrNull(form.supplier),
      supplier_code: form.supplierCode || null,
      hsn_id: toUuidOrNull(form.hsnId || form.hsnCode),
      gst_rate_id: toUuidOrNull(form.gstId),
      category_id: toUuidOrNull(form.categoryId),
      segment_id: toUuidOrNull(form.segmentId),
      formulation_id: toUuidOrNull(form.formId),
      cfu_id: toUuidOrNull(form.cfuId),
      authority: form.authority || null,
      pack_size: parseNum(form.packSize),
      base_unit: form.baseUnit,
      unit: form.baseUnit,
      mou: form.mou || null,
      unit_per_packing: parseNum(form.unitPerCase),
      packing_unit: form.packagingUnit,
      net_weight: parseNum(form.netWeightPerPackagingUnit),
      gross_weight: parseNum(form.grossWeight),
      mrp: parseNum(form.mrp),
      cost_price: parseNum(form.costPrice),
      is_active: form.status === "active",
      status: form.status === "active" ? "Active" : "Inactive",
      assets: buildProductApiAssets(productImages, productUrls),
    };

    updateMutation.mutate(
      {
        id,
        payload,
        images: collectNewProductImageFiles(productImages),
      },
      {
        onSuccess: () => {
          setToast({ msg: "Product updated successfully.", type: "success" });
          setTimeout(() => router.push(`/masters/products/${id}`), 900);
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
              "Failed to update product.",
            ),
            type: "error",
          });
          setTimeout(() => setToast(null), 4000);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading product details...</p>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Link href="/masters/products" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Product"
      description={`Masters → Product Master → ${form.productCode || form.productName}`}
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          {form.productCode && (
            <span className="text-[11px] font-mono font-semibold px-2 py-1.5 rounded bg-brand-50 text-brand-700">
              {form.productCode}
            </span>
          )}
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" /> Update Product
          </Button>
        </div>
      }
    >
      <ProductForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
        previewNumber={previewNumber}
        productImages={productImages}
        productUrls={productUrls}
        onImageAdd={(items) => setProductImages((prev) => [...prev, ...items])}
        onImageRemove={(id) => setProductImages((prev) => prev.filter((item) => item.id !== id))}
        onUrlAdd={(item) => setProductUrls((prev) => [...prev, item])}
        onUrlRemove={(id) => setProductUrls((prev) => prev.filter((item) => item.id !== id))}
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
