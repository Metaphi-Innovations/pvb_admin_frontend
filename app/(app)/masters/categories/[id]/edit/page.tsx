"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryForm, DEFAULT_CATEGORY_FORM, type CategoryFormValues, validateCategoryForm } from "../../components/CategoryForm";
import { loadCategories, saveCategories, todayStr, type Category } from "../../category-data";

interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn("fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium", toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function EditCategoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryFormValues>(DEFAULT_CATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const items = loadCategories();
    const found = items.find((item) => item.id === Number(id)) ?? null;
    setRecord(found);
    if (found) {
      setForm({
        categoryCode: found.categoryCode,
        categoryName: found.categoryName,
        description: found.description,
        status: found.status,
      });
    }
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const persist = () => {
    const errs = validateCategoryForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }
    const items = loadCategories();
    const updated = items.map((item) =>
      item.id === Number(id)
        ? {
            ...item,
            categoryCode: form.categoryCode,
            categoryName: form.categoryName.trim(),
            description: form.description.trim(),
            status: form.status,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : item,
    );
    saveCategories(updated);
    setToast({ msg: "Category updated successfully", type: "success" });
    setTimeout(() => router.push(`/masters/categories/${id}`), 900);
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Category not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        <div className="sticky top-0 z-10 flex flex-shrink-0 items-center gap-2.5 border-b border-border bg-white px-4 py-2">
          <button type="button" onClick={() => router.back()} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-none text-foreground">Edit Category</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Masters → Category Master → Edit</p>
          </div>
          <span className="rounded bg-brand-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-brand-700">{form.categoryCode}</span>
          <Button variant="outline" size="sm" className="h-7 px-3 text-[11px]" onClick={() => router.back()}>Discard</Button>
          <Button size="sm" className="h-7 gap-1.5 bg-brand-600 px-3 text-[11px] text-white hover:bg-brand-700" onClick={persist}>
            <Save className="h-3.5 w-3.5" /> Update Category
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="mx-auto max-w-4xl">
            <CategoryForm form={form} onChange={setForm} errors={errors} onClearError={clearErr} />
          </div>
        </div>
      </div>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
