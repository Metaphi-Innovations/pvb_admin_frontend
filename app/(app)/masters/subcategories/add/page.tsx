"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SUBCATEGORY_FORM,
  SubCategoryForm,
  type SubCategoryFormValues,
  validateSubCategoryForm,
} from "../components/SubCategoryForm";
import {
  generateSubCategoryCode,
  getCategoryOptions,
  loadSubCategories,
  nextSubCategoryId,
  saveSubCategories,
  todayStr,
  type SubCategory,
} from "../subcategory-data";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn("fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium", toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function AddSubCategoryPage() {
  const router = useRouter();
  const [form, setForm] = useState<SubCategoryFormValues>(DEFAULT_SUBCATEGORY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [subCategoryCode, setSubCategoryCode] = useState("SUB-001");

  useEffect(() => {
    const items = loadSubCategories();
    const code = generateSubCategoryCode(items);
    setSubCategoryCode(code);
    setForm((prev) => ({ ...prev, subCategoryCode: code }));
  }, []);

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

  const persist = () => {
    const errs = validateSubCategoryForm(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }
    const items = loadSubCategories();
    const record: SubCategory = {
      id: nextSubCategoryId(items),
      subCategoryCode,
      subCategoryName: form.subCategoryName.trim(),
      categoryName: form.categoryName.trim(),
      description: form.description.trim(),
      status: form.status,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
    };
    saveSubCategories([...items, record]);
    setToast({ msg: "Sub Category added successfully", type: "success" });
    setTimeout(() => router.push("/masters/subcategories"), 900);
  };

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border bg-white px-4 py-2 flex-shrink-0">
          <button type="button" onClick={() => router.back()} className="flex-shrink-0 p-1 transition-colors rounded hover:bg-muted">
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none">Add Sub Category</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Sub Category Master → Add</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">{subCategoryCode}</span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>Discard</Button>
          <Button size="sm" className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700" onClick={persist}>
            <Save className="w-3 h-3" /> Save Sub Category
          </Button>
        </div>

        <div className="flex-1 px-5 py-4 overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <SubCategoryForm form={form} onChange={setForm} errors={errors} onClearError={clearErr} categoryOptions={getCategoryOptions()} />
          </div>
        </div>
      </div>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}

