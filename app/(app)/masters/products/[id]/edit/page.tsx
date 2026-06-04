"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadProducts, saveProducts } from "../../product-data";
import {
  formValuesToProduct,
  ProductForm,
  productToFormValues,
  type ProductFormValues,
  validateProductForm,
} from "../../components/ProductForm";
import { type ProductMediaItem } from "../../product-data";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<ProductFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [productCode, setProductCode] = useState("");
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);

  useEffect(() => {
    const found = loadProducts().find((item) => item.id === Number(id));
    if (!found) return;
    setForm(productToFormValues(found));
    setProductCode(found.productId);
    setMediaItems(found.assets ?? found.mediaItems ?? []);
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
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadProducts();
    const existing = list.find((item) => item.id === Number(id));
    if (!existing) return;

    const updated = formValuesToProduct(form, { ...existing, mediaItems });
    saveProducts(list.map((item) => (item.id === updated.id ? updated : item)));
    setToast({ msg: "Product updated successfully.", type: "success" });
    setTimeout(() => router.push(`/masters/products/${id}`), 900);
  };

  const addMedia = (items: ProductMediaItem[]) => setMediaItems((prev) => [...prev, ...items]);
  const removeMedia = (id: string) =>
    setMediaItems((prev) => {
      const next = prev.filter((item) => {
        if (item.id !== id) return true;
        if (typeof item.url === "string" && item.url.startsWith("blob:")) {
          URL.revokeObjectURL(item.url);
        }
        return false;
      });
      return next;
    });
  const uploadMedia = () => setMediaItems((prev) => prev.map((item) => (item.uploaded ? item : { ...item, uploaded: true })));

  if (!form) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Product not found.</p>
          <Link href="/masters/products" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-none">Edit Product</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Product Master → {productCode}</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {productCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Update Product
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-muted/10">
          <ProductForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={clearErr}
            mediaItems={mediaItems}
            onMediaAdd={addMedia}
            onMediaRemove={removeMedia}
            onMediaUpload={uploadMedia}
          />
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
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
