"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  generateProductCode,
  loadProducts,
  nextProductId,
  saveProducts,
  todayStr,
  type ProductMediaItem,
} from "../product-data";
import {
  DEFAULT_PRODUCT_FORM,
  formValuesToProduct,
  ProductForm,
  type ProductFormValues,
  validateProductForm,
} from "../components/ProductForm";

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(DEFAULT_PRODUCT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productCode, setProductCode] = useState("PRD-0001");
  const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setProductCode(generateProductCode(loadProducts()));
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateProductForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadProducts();
    const today = todayStr();
    const record = formValuesToProduct(form, {
      id: nextProductId(list),
      productId: productCode,
      mediaItems,
      createdBy: "Admin",
      createdDate: today,
    });

    saveProducts([...list, record]);
    setToast({ msg: "Product created successfully.", type: "success" });
    setTimeout(() => router.push("/masters/products"), 900);
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

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 flex items-center flex-shrink-0 gap-3 px-5 py-3 bg-white border-b border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors border rounded-lg border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none text-foreground">Add Product</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Product Master → Add</p>
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
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto bg-muted/10">
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
