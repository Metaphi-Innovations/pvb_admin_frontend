"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getProductImages,
  getProductUrls,
  loadProducts,
  saveProducts,
  type ProductImage,
  type ProductUrl,
} from "../../product-data";
import {
  formValuesToProduct,
  ProductForm,
  productToFormValues,
  type ProductFormValues,
  validateProductForm,
} from "../../components/ProductForm";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<ProductFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productUrls, setProductUrls] = useState<ProductUrl[]>([]);

  useEffect(() => {
    const found = loadProducts().find((item) => item.id === Number(id));
    if (!found) return;
    setForm(productToFormValues(found));
    setProductImages(getProductImages(found));
    setProductUrls(getProductUrls(found));
  }, [id]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    if (!form) return;
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

    const list = loadProducts();
    const existing = list.find((item) => item.id === Number(id));
    if (!existing) return;

    const updated = formValuesToProduct(form, {
      ...existing,
      productImages,
      productUrls,
    });
    saveProducts(list.map((item) => (item.id === updated.id ? updated : item)));
    setToast({ msg: "Product updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/products/${id}`), 900);
  };

  if (!form) {
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
