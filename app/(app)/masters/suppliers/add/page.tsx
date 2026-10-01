"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import {
  generateSupplierCode,
  loadSuppliers,
  nextSupplierId,
  saveSuppliers,
  todayStr,
} from "../supplier-data";
import {
  DEFAULT_SUPPLIER_FORM,
  formValuesToSupplier,
  SupplierForm,
  type SupplierFormValues,
  validateSupplierForm,
} from "../components/SupplierForm";

export default function NewSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState<SupplierFormValues>(DEFAULT_SUPPLIER_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [supplierCode, setSupplierCode] = useState("SUP-0001");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setSupplierCode(generateSupplierCode(loadSuppliers()));
  }, []);

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    const validation = validateSupplierForm(form);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    const list = loadSuppliers();
    const today = todayStr();
    const record = formValuesToSupplier(form, {
      id: nextSupplierId(list),
      supplierCode,
      createdBy: "Admin",
      createdDate: today,
    });

    saveSuppliers([...list, record]);
    setToast({ msg: "Supplier created successfully.", type: "success" });
    setTimeout(() => router.push("/masters/suppliers"), 900);
  };

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
            <h2 className="text-sm font-semibold leading-none text-foreground">Add Supplier</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Supplier Master → Add</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {supplierCode}
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
          <SupplierForm form={form} onChange={setForm} errors={errors} onClearError={clearErr} />
        </div>
      </div>

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
    </AppLayout>
  );
}
