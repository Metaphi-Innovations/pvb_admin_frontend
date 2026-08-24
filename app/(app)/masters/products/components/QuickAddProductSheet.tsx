"use client";

import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
} from "@/app/(app)/masters/products/product-data";
import {
  DEFAULT_PRODUCT_FORM,
  ProductForm,
  type ProductFormValues,
  validateProductForm,
} from "@/app/(app)/masters/products/components/ProductForm";
import { useCreateProduct, useProductPreviewNumber } from "@/hooks/masters";
import { ProductListService } from "@/services/product-list.service";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toUuidOrNull(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

export type QuickAddProductResult = {
  productId: string;
  productCode: string;
  productName: string;
};

type QuickAddProductSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (product: QuickAddProductResult) => void;
};

export function QuickAddProductSheet({
  open,
  onOpenChange,
  onCreated,
}: QuickAddProductSheetProps) {
  const [form, setForm] = useState<ProductFormValues>(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);
  const { data: previewNumber } = useProductPreviewNumber(
    form.packSize,
    form.baseUnit,
  );
  const createMutation = useCreateProduct();

  useEffect(() => {
    if (!open) return;
    setForm({ ...DEFAULT_PRODUCT_FORM });
    setErrors({});
    setProductImages([]);
    setProductUrls([]);
  }, [open]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleClose = () => {
    if (createMutation.isPending) return;
    onOpenChange(false);
  };

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
      toast.error(Object.values(validation)[0] ?? "Please fix the errors before saving.");
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
        onSuccess: (created) => {
          toast.success("Product created successfully.");
          onOpenChange(false);
          if (created.productId) {
            onCreated?.(created);
          }
        },
        onError: (err) => {
          if (isProductApiValidationError(err)) {
            const apiFieldErrors = mapProductApiErrorsToFormFields(err);
            if (Object.keys(apiFieldErrors).length > 0) {
              setErrors((prev) => ({ ...prev, ...apiFieldErrors }));
            }
            toast.error(
              getProductApiValidationToastMessage(
                err,
                "Please fix the validation errors.",
              ),
            );
            return;
          }

          toast.error(
            ProductListService.extractErrorMessage(err, "Failed to save product."),
          );
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}>
      <SheetContent className="max-w-[960px] w-[min(960px,100vw)]">
        <SheetHeader>
          <SheetTitle>Quick Add Product</SheetTitle>
          <SheetDescription>
            Same Product Master form — code generation, GST, packaging and assets.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-4 sm:px-6">
          <ProductForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={clearErr}
            productImages={productImages}
            previewNumber={previewNumber}
            productUrls={productUrls}
            onImageAdd={(items) => setProductImages((prev) => [...prev, ...items])}
            onImageRemove={(id) =>
              setProductImages((prev) => prev.filter((item) => item.id !== id))
            }
            onUrlAdd={(item) => setProductUrls((prev) => [...prev, item])}
            onUrlRemove={(id) =>
              setProductUrls((prev) => prev.filter((item) => item.id !== id))
            }
            isNew
          />
        </SheetBody>
        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={createMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending ? "Saving…" : "Save Product"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
