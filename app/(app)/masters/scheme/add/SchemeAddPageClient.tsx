"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords } from "@/lib/masters/common";
import { SchemeUnifiedConfigForm } from "../components/SchemeUnifiedConfigForm";
import { loadConsolidatedSchemeRecords } from "../product-near-expiry-scheme";
import {
  createDefaultUnifiedForm,
  getUnifiedSchemeCodePreview,
  unifiedFormToRecord,
  validateUnifiedSchemeForm,
  type SchemeUnifiedForm,
} from "../scheme-unified-config";
import { SCHEME_STORAGE_KEY } from "../scheme-data";

type ToastState = { msg: string; type: "success" | "error" };

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      {toast.msg}
    </div>
  );
}

export default function SchemeAddPageClient() {
  const router = useRouter();
  const [form, setForm] = useState<SchemeUnifiedForm>(() => createDefaultUnifiedForm());
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);
  const codePreview = useMemo(() => getUnifiedSchemeCodePreview(), []);

  const showToast = (next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = () => {
    const err = validateUnifiedSchemeForm(form);
    if (err) {
      setFormError(err);
      showToast({ msg: err, type: "error" });
      return;
    }
    const list = loadConsolidatedSchemeRecords();
    const startId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    const record = unifiedFormToRecord(form, list, startId);
    saveMasterRecords(SCHEME_STORAGE_KEY, [...list, record]);
    showToast({ msg: "Scheme saved as draft", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  return (
    <>
      <FormContainer
        title="Add Scheme"
        description="Masters → Scheme Master"
        onBack={() => router.push("/masters/scheme")}
        onCancel={() => router.push("/masters/scheme")}
        compact
        noCard
        actions={
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 bg-brand-600 text-[11px] text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </Button>
        }
      >
        <SchemeUnifiedConfigForm
          form={form}
          onChange={(next) => {
            setForm(next);
            setFormError("");
          }}
          mode="add"
          codePreview={codePreview}
          error={formError}
        />
      </FormContainer>
      {toast ? <Toast toast={toast} /> : null}
    </>
  );
}
