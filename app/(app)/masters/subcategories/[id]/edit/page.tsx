"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCategoryDropdown } from "@/hooks/masters/use-categories";
import { toCategoryNameSelectOptions } from "@/services/category-list.service";
import { DEFAULT_SUBCATEGORY_FORM, SubCategoryForm, type SubCategoryFormValues, validateSubCategoryForm } from "../../components/SubCategoryForm";
import { loadSubCategories, saveSubCategories, todayStr, type SubCategory } from "../../subcategory-data";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn("fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium", toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function EditSubCategoryPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const categoryQuery = useCategoryDropdown();
  const [record, setRecord] = useState<SubCategory | null>(null);
  const [form, setForm] = useState<SubCategoryFormValues>(DEFAULT_SUBCATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const items = loadSubCategories();
    const found = items.find((item) => item.id === Number(id)) ?? null;
    setRecord(found);
    if (found) {
      setForm({
        subCategoryCode: found.subCategoryCode,
        subCategoryName: found.subCategoryName,
        categoryName: found.categoryName,
        description: found.description,
        status: found.status,
      });
    }
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const categoryOptions = useMemo(
    () => toCategoryNameSelectOptions(categoryQuery.data ?? [], form.categoryName),
    [categoryQuery.data, form.categoryName],
  );

  const persist = () => {
    const errs = validateSubCategoryForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }
    const items = loadSubCategories();
    const updated = items.map((item) =>
      item.id === Number(id)
        ? {
            ...item,
            subCategoryCode: form.subCategoryCode,
            subCategoryName: form.subCategoryName.trim(),
            categoryName: form.categoryName.trim(),
            description: form.description.trim(),
            status: form.status,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : item,
    );
    saveSubCategories(updated);
    setToast({ msg: "Sub Category updated successfully", type: "success" });
    setTimeout(() => router.push(`/masters/subcategories/${id}`), 900);
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Sub Category not found.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-foreground leading-none">Edit Sub Category</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Sub Category Master → Edit</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {form.subCategoryCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={persist}
          >
            <Save className="w-3.5 h-3.5" /> Update Sub Category
          </Button>
        </div>

        {/* Form Body */}
        <div className="flex-1 px-5 py-4 overflow-y-auto bg-muted/10">
          <SubCategoryForm
            form={form}
            onChange={setForm}
            errors={errors}
            onClearError={clearErr}
            categoryOptions={categoryOptions}
            categoryLoading={categoryQuery.isFetching}
          />
        </div>
      </div>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
